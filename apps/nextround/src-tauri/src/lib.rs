mod audio;
pub mod timer;
mod update_gate;
#[cfg(feature = "direct-update")]
mod updates;
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
    update_gate: update_gate::UpdateGate,
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
            if let Err(error) = self.audio.keep_awake(session.active() && !session.paused) {
                session.notice = Some(error);
            }
        }
    }
}
type Shared = Arc<Mutex<Runtime>>;

#[tauri::command]
fn start_workout(config: Config, state: State<'_, Shared>) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    if rt.update_gate.busy {
        return Err("An update is being installed. Wait for NextRound to restart.".into());
    }
    if rt.session.as_ref().is_some_and(Session::active) {
        return Err("A workout is already active.".into());
    }
    let mut session = Session::new(config)?;
    if let Some(cue) = timer::cue_at(&session.config, 0) {
        if let Err(error) = rt.audio.play(cue) {
            session.notice = Some(error);
        }
    }
    if let Err(error) = rt.audio.keep_awake(true) {
        session.notice = Some(error);
    }
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
    if let Err(error) = rt
        .audio
        .keep_awake(!result.paused && result.phase != "cancelled" && result.phase != "completed")
    {
        if let Some(session) = rt.session.as_mut() {
            session.notice = Some(error);
        }
    }
    Ok(result)
}
#[tauri::command]
fn read_workout(state: State<'_, Shared>) -> Result<Option<Snapshot>, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    Ok(rt.session.as_ref().map(Session::snapshot))
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle, state: State<'_, Shared>) -> Result<(), String> {
    {
        let rt = state.lock().map_err(|_| "Timer unavailable")?;
        if rt.session.as_ref().is_some_and(Session::active) {
            return Err("Stop the active workout before quitting.".into());
        }
    }
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn distribution_channel() -> &'static str {
    if cfg!(feature = "direct-update") {
        "direct"
    } else {
        "app-store"
    }
}

pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(feature = "direct-update")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_workout,
            control_workout,
            read_workout,
            quit_app,
            distribution_channel,
            updates::check_app_update,
            updates::install_app_update
        ]);
    #[cfg(not(feature = "direct-update"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        start_workout,
        control_workout,
        read_workout,
        quit_app,
        distribution_channel
    ]);
    builder
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
            let settings =
                MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
            let app_menu = Submenu::with_items(
                app,
                "NextRound",
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &settings,
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
                if event.id().as_ref() == "settings" {
                    let _ = app.emit("open-settings", ());
                }
                if event.id().as_ref() == "safe-quit" {
                    app.exit(0);
                }
            });
            let audio = Audio::new().map_err(std::io::Error::other)?;
            let runtime = Arc::new(Mutex::new(Runtime {
                session: None,
                update_gate: update_gate::UpdateGate::default(),
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
        .build(tauri::generate_context!())
        .expect("Unable to initialize NextRound")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, code, .. } = &event {
                if let Some(state) = app.try_state::<Shared>() {
                    let rt = state.lock().unwrap_or_else(|e| e.into_inner());
                    if !rt.update_gate.allows_exit(*code) {
                        api.prevent_exit();
                        return;
                    }
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
                    let _ = rt.audio.keep_awake(false);
                }
            }
        });
}

#[cfg(test)]
mod update_signature_test;
