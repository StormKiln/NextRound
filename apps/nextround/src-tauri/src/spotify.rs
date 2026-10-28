use serde::{Deserialize, Serialize};
use std::{
    ffi::{c_char, CStr},
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
};
use tauri::State;

extern "C" {
    fn nr_spotify_installed() -> i32;
    fn nr_spotify_running() -> i32;
    fn nr_spotify_permission(ask: i32) -> i32;
    fn nr_spotify_command(play: i32) -> i32;
    fn nr_spotify_now_playing(out: *mut *mut c_char) -> i32;
    fn nr_spotify_free(value: *mut c_char);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Command {
    Play,
    Pause,
}
/// Playback the workout wants. Blocks completing inside a multi-part session keep the music going.
pub fn desired(phase: Option<&str>, paused: bool, between_blocks: bool) -> Option<Command> {
    match phase? {
        "completed" if between_blocks => None,
        "completed" | "cancelled" => Some(Command::Pause),
        _ if paused => Some(Command::Pause),
        _ => Some(Command::Play),
    }
}
/// Only pause music that the workout itself was playing, so recovery or enabling the setting never interrupts the listener.
pub fn transition(last: Option<Command>, next: Option<Command>) -> Option<Command> {
    match next? {
        Command::Play if last != Some(Command::Play) => Some(Command::Play),
        Command::Pause if last == Some(Command::Play) => Some(Command::Pause),
        _ => None,
    }
}

const NOT_RUNNING: i32 = -600;
const NO_OBJECT: i32 = -1728;
const TIMEOUT: i32 = -1712;
fn message(status: i32) -> String {
    match status {
        -1743 | -1744 => "NextRound isn't allowed to control Spotify. Allow it in System Settings › Privacy & Security › Automation.",
        TIMEOUT => "Spotify didn't respond in time. Your workout continues.",
        _ => "Spotify couldn't be controlled. Your workout continues.",
    }
    .into()
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    name: String,
    artist: String,
    artwork_url: Option<String>,
}
fn parse_track(value: &str) -> Option<Track> {
    let mut fields = value.split('\u{1f}');
    if fields.next()? != "playing" {
        return None;
    }
    let name = fields.next()?.to_string();
    let artist = fields.next()?.to_string();
    let artwork_url = fields
        .next()
        .filter(|url| url.starts_with("https://i.scdn.co/"))
        .map(str::to_string);
    (!name.is_empty()).then_some(Track {
        name,
        artist,
        artwork_url,
    })
}
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    track: Option<Track>,
    notice: Option<String>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    enabled: bool,
    installed: bool,
}
#[derive(Deserialize, Serialize)]
struct Stored {
    version: u32,
    enabled: bool,
}

pub struct Spotify {
    enabled: AtomicBool,
    querying: AtomicBool,
    notice: Mutex<Option<String>>,
    track: Mutex<Option<Track>>,
    path: PathBuf,
}
impl Spotify {
    pub fn load(path: PathBuf) -> Arc<Self> {
        let enabled = std::fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Stored>(&bytes).ok())
            .is_some_and(|stored| stored.version == 1 && stored.enabled);
        Arc::new(Self {
            enabled: AtomicBool::new(enabled),
            querying: AtomicBool::new(false),
            notice: Mutex::new(None),
            track: Mutex::new(None),
            path,
        })
    }
    fn report(&self, status: i32) {
        let notice =
            (status != 0 && status != NOT_RUNNING && status != NO_OBJECT).then(|| message(status));
        if let Ok(mut current) = self.notice.lock() {
            *current = notice;
        }
    }
    fn save(&self, enabled: bool) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or("Settings directory is unavailable")?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let bytes = serde_json::to_vec(&Stored {
            version: 1,
            enabled,
        })
        .map_err(|e| e.to_string())?;
        let temporary = self.path.with_extension("json.tmp");
        std::fs::write(&temporary, bytes)
            .and_then(|_| std::fs::rename(&temporary, &self.path))
            .map_err(|e| {
                let _ = std::fs::remove_file(&temporary);
                e.to_string()
            })
    }
}

/// Owned by the timer Runtime. Sending only queues work for the Apple Events thread.
pub struct Link {
    spotify: Arc<Spotify>,
    last: Option<Command>,
    queue: mpsc::Sender<Command>,
}
impl Link {
    pub fn new(spotify: Arc<Spotify>) -> Self {
        let (queue, commands) = mpsc::channel::<Command>();
        let worker = spotify.clone();
        std::thread::spawn(move || {
            while let Ok(mut command) = commands.recv() {
                while let Ok(newer) = commands.try_recv() {
                    command = newer;
                }
                if worker.enabled.load(Ordering::SeqCst) && unsafe { nr_spotify_running() } != 0 {
                    worker.report(unsafe { nr_spotify_command((command == Command::Play) as i32) });
                }
            }
        });
        Self {
            spotify,
            last: None,
            queue,
        }
    }
    pub fn sync(&mut self, next: Option<Command>) {
        if let Some(command) = transition(self.last, next) {
            if self.spotify.enabled.load(Ordering::SeqCst) {
                let _ = self.queue.send(command);
            }
        }
        if next.is_some() {
            self.last = next;
        }
    }
}

#[tauri::command]
pub fn spotify_settings(state: State<'_, Arc<Spotify>>) -> Settings {
    Settings {
        enabled: state.enabled.load(Ordering::SeqCst),
        installed: unsafe { nr_spotify_installed() } != 0,
    }
}
#[tauri::command]
pub async fn set_spotify_enabled(
    enabled: bool,
    state: State<'_, Arc<Spotify>>,
) -> Result<Option<String>, String> {
    let mut note = None;
    if enabled {
        if unsafe { nr_spotify_installed() } == 0 {
            return Err("Install the Spotify desktop app to use this setting.".into());
        }
        // Ask macOS for consent now, not at launch or mid-workout. A stopped Spotify is not launched.
        let status = tauri::async_runtime::spawn_blocking(|| {
            let (done, result) = mpsc::channel();
            std::thread::spawn(move || {
                let _ = done.send(unsafe {
                    if nr_spotify_running() == 0 {
                        NOT_RUNNING
                    } else {
                        nr_spotify_permission(1)
                    }
                });
            });
            result
                .recv_timeout(std::time::Duration::from_secs(90))
                .unwrap_or(TIMEOUT)
        })
        .await
        .map_err(|e| e.to_string())?;
        match status {
            0 => {}
            NOT_RUNNING => {
                note = Some("Open Spotify before your workout. macOS will ask once for permission to control it.".into())
            }
            _ => return Err(message(status)),
        }
    }
    state.save(enabled)?;
    state.enabled.store(enabled, Ordering::SeqCst);
    state.report(0);
    Ok(note)
}
#[tauri::command]
pub async fn spotify_now_playing(state: State<'_, Arc<Spotify>>) -> Result<NowPlaying, String> {
    let spotify = state.inner().clone();
    if !spotify.enabled.load(Ordering::SeqCst) {
        return Ok(NowPlaying::default());
    }
    // A slow or prompting Spotify must not pile up queries; return the last answer instead.
    if !spotify.querying.swap(true, Ordering::SeqCst) {
        let worker = spotify.clone();
        let _ = tauri::async_runtime::spawn_blocking(move || {
            let track = if unsafe { nr_spotify_running() } == 0 {
                None
            } else {
                let mut raw = std::ptr::null_mut();
                let status = unsafe { nr_spotify_now_playing(&mut raw) };
                let track = (!raw.is_null())
                    .then(|| {
                        unsafe { CStr::from_ptr(raw) }
                            .to_string_lossy()
                            .into_owned()
                    })
                    .and_then(|value| parse_track(&value));
                unsafe { nr_spotify_free(raw) };
                if status != 0 {
                    worker.report(status);
                }
                track
            };
            if let Ok(mut current) = worker.track.lock() {
                *current = track;
            }
            worker.querying.store(false, Ordering::SeqCst);
        })
        .await;
    }
    let track = spotify.track.lock().map_err(|e| e.to_string())?.clone();
    let notice = spotify.notice.lock().map_err(|e| e.to_string())?.clone();
    Ok(NowPlaying { track, notice })
}

#[cfg(test)]
mod tests {
    use super::*;
    use Command::*;
    #[test]
    fn workout_state_maps_to_playback() {
        assert_eq!(desired(None, false, false), None);
        assert_eq!(desired(Some("leadIn"), false, false), Some(Play));
        assert_eq!(desired(Some("running"), false, false), Some(Play));
        assert_eq!(desired(Some("running"), true, false), Some(Pause));
        assert_eq!(desired(Some("cancelled"), false, true), Some(Pause));
        assert_eq!(desired(Some("completed"), false, false), Some(Pause));
        assert_eq!(desired(Some("completed"), false, true), None);
    }
    #[test]
    fn only_changes_send_commands_and_only_workout_music_is_paused() {
        assert_eq!(transition(None, Some(Play)), Some(Play));
        assert_eq!(transition(Some(Pause), Some(Play)), Some(Play));
        assert_eq!(transition(Some(Play), Some(Play)), None);
        assert_eq!(transition(Some(Play), Some(Pause)), Some(Pause));
        assert_eq!(transition(None, Some(Pause)), None);
        assert_eq!(transition(Some(Pause), Some(Pause)), None);
        assert_eq!(transition(Some(Play), None), None);
    }
    #[test]
    fn link_tracks_state_while_disabled_without_queueing() {
        let dir = std::env::temp_dir().join(format!("nextround-spotify-{}", std::process::id()));
        let spotify = Spotify::load(dir.join("spotify.json"));
        let (queue, commands) = mpsc::channel();
        let mut link = Link {
            spotify: spotify.clone(),
            last: None,
            queue,
        };
        link.sync(Some(Play));
        assert!(commands.try_recv().is_err());
        spotify.enabled.store(true, Ordering::SeqCst);
        link.sync(Some(Play));
        link.sync(None);
        assert!(commands.try_recv().is_err());
        link.sync(Some(Pause));
        assert_eq!(commands.try_recv(), Ok(Pause));
        link.sync(Some(Play));
        assert_eq!(commands.try_recv(), Ok(Play));
    }
    #[test]
    fn settings_default_off_and_persist() {
        let dir =
            std::env::temp_dir().join(format!("nextround-spotify-prefs-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let path = dir.join("spotify.json");
        assert!(!Spotify::load(path.clone()).enabled.load(Ordering::SeqCst));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(&path, b"{bad").unwrap();
        assert!(!Spotify::load(path.clone()).enabled.load(Ordering::SeqCst));
        Spotify::load(path.clone()).save(true).unwrap();
        assert!(Spotify::load(path.clone()).enabled.load(Ordering::SeqCst));
        let _ = std::fs::remove_dir_all(&dir);
    }
    #[test]
    fn parses_tracks_and_rejects_untrusted_artwork() {
        assert_eq!(
            parse_track("playing\u{1f}Song\u{1f}Band\u{1f}https://i.scdn.co/image/x"),
            Some(Track {
                name: "Song".into(),
                artist: "Band".into(),
                artwork_url: Some("https://i.scdn.co/image/x".into()),
            })
        );
        assert_eq!(
            parse_track("playing\u{1f}Song\u{1f}Band\u{1f}http://evil/x")
                .and_then(|t| t.artwork_url),
            None
        );
        assert_eq!(parse_track("playing\u{1f}\u{1f}Band\u{1f}"), None);
        assert_eq!(parse_track("paused"), None);
        assert!(message(-1743).contains("Privacy & Security › Automation"));
    }
    #[test]
    #[ignore = "requires Spotify running and Automation consent in an interactive macOS session"]
    fn native_spotify_round_trip() {
        unsafe {
            assert_ne!(nr_spotify_installed(), 0);
            assert_ne!(nr_spotify_running(), 0);
            assert_eq!(nr_spotify_permission(1), 0);
            assert_eq!(nr_spotify_command(1), 0);
            std::thread::sleep(std::time::Duration::from_secs(2));
            let mut raw = std::ptr::null_mut();
            assert_eq!(nr_spotify_now_playing(&mut raw), 0);
            assert!(!raw.is_null());
            let track = parse_track(&CStr::from_ptr(raw).to_string_lossy()).unwrap();
            nr_spotify_free(raw);
            println!("Now playing {} by {}", track.name, track.artist);
            assert_eq!(nr_spotify_command(0), 0);
            std::thread::sleep(std::time::Duration::from_secs(1));
            assert_eq!(nr_spotify_now_playing(&mut raw), 0);
            assert!(raw.is_null());
        }
    }
}
