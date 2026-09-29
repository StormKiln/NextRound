mod audio;
pub mod timer;
use audio::Audio;
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime},
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager, State,
};
use timer::{Config, Session, Snapshot};

struct Runtime {
    session: Option<Session>,
    audio: Audio,
    last: Instant,
    wall: SystemTime,
    remainder: Duration,
}
impl Runtime {
    fn update(&mut self) {
        let now = Instant::now();
        let wall = SystemTime::now();
        let delta = now.duration_since(self.last);
        let wall_delta = wall.duration_since(self.wall).unwrap_or_default();
        self.last = now;
        self.wall = wall;
        self.remainder += delta;
        let millis = self.remainder.as_millis() as u64;
        self.remainder -= Duration::from_millis(millis);
        if let Some(session) = self.session.as_mut() {
            let cue = session.advance(
                millis,
                delta > Duration::from_secs(2) || wall_delta > Duration::from_secs(2),
            );
            if session.paused || session.cancelled {
                self.audio.stop();
            }
            if let Some(cue) = cue {
                if let Err(error) = self.audio.play(cue) {
                    session.notice = Some(error);
                }
            }
            if let Some(error) = self.audio.check() {
                session.notice = Some(error);
            }
            self.audio.keep_awake(session.active() && !session.paused);
        }
    }
}
type Shared = Arc<Mutex<Runtime>>;

#[tauri::command]
fn start_workout(config: Config, state: State<'_, Shared>) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    if rt.session.as_ref().is_some_and(Session::active) {
        return Err("A workout is already active.".into());
    }
    let mut session = Session::new(config)?;
    if let Some(cue) = timer::cue_at(&session.config, 0) {
        if let Err(error) = rt.audio.play(cue) {
            session.notice = Some(error);
        }
    }
    rt.audio.keep_awake(true);
    let result = session.snapshot();
    rt.session = Some(session);
    rt.last = Instant::now();
    rt.wall = SystemTime::now();
    rt.remainder = Duration::ZERO;
    Ok(result)
}
#[tauri::command]
fn control_workout(action: String, state: State<'_, Shared>) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    let session = rt.session.as_mut().ok_or("No active workout")?;
    match action.as_str() {
        "pause" if session.active() => session.paused = true,
        "resume" if session.active() => {
            session.paused = false;
            session.notice = None;
        }
        "stop" => {
            session.cancelled = true;
            session.paused = false;
        }
        _ => return Err("This action is not available.".into()),
    }
    let result = session.snapshot();
    rt.audio.stop();
    rt.audio
        .keep_awake(!result.paused && result.phase != "cancelled" && result.phase != "completed");
    Ok(result)
}
#[tauri::command]
fn read_workout(state: State<'_, Shared>) -> Result<Option<Snapshot>, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    Ok(rt.session.as_ref().map(Session::snapshot))
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let menu = Menu::default(app.handle())?;
            menu.remove_at(0)?;
            let quit = MenuItem::with_id(
                app,
                "safe-quit",
                "Quit NextRound",
                true,
                Some("CmdOrCtrl+Q"),
            )?;
            let app_menu = Submenu::with_items(
                app,
                "NextRound",
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;
            menu.insert(&app_menu, 0)?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if event.id().as_ref() == "safe-quit" {
                    app.exit(0);
                }
            });
            let audio = Audio::new(app.path().app_cache_dir()?.join("sounds"))
                .map_err(std::io::Error::other)?;
            let runtime = Arc::new(Mutex::new(Runtime {
                session: None,
                audio,
                last: Instant::now(),
                wall: SystemTime::now(),
                remainder: Duration::ZERO,
            }));
            app.manage(runtime.clone());
            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(50));
                let mut rt = runtime.lock().unwrap_or_else(|e| e.into_inner());
                rt.update();
                if let Some(session) = &rt.session {
                    let _ = handle.emit("workout-snapshot", session.snapshot());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_workout,
            control_workout,
            read_workout
        ])
        .build(tauri::generate_context!())
        .expect("Unable to initialize NextRound")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = &event {
                if let Some(state) = app.try_state::<Shared>() {
                    let rt = state.lock().unwrap_or_else(|e| e.into_inner());
                    if rt.session.as_ref().is_some_and(Session::active) {
                        api.prevent_exit();
                        let _ = app.emit("quit-requested", ());
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            }
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app.try_state::<Shared>() {
                    let mut rt = state.lock().unwrap_or_else(|e| e.into_inner());
                    rt.audio.stop();
                    rt.audio.keep_awake(false);
                }
            }
        });
}
