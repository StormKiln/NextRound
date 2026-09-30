use tauri_plugin_opener::OpenerExt;
mod audio;
pub mod timer;
mod update_gate;
#[cfg(feature = "direct-update")]
mod updates;
mod window_behavior;
use audio::Audio;
use std::{
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
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

#[tauri::command]
fn open_project_page(app: tauri::AppHandle, page: String) -> Result<(), String> {
    let url = match page.as_str() {
        "releases" => "https://github.com/StormKiln/NextRound/releases",
        "issues" => "https://github.com/StormKiln/NextRound/issues",
        _ => return Err("Unknown project page".into()),
    };
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

struct WindowSettings {
    preferences: Mutex<window_behavior::Preferences>,
    minimize_generation: AtomicU64,
}
#[tauri::command]
fn get_close_behavior(
    state: State<WindowSettings>,
) -> Result<window_behavior::CloseBehavior, String> {
    Ok(state
        .preferences
        .lock()
        .map_err(|_| "Window settings unavailable")?
        .behavior)
}
#[tauri::command]
fn set_close_behavior(
    state: State<WindowSettings>,
    behavior: window_behavior::CloseBehavior,
) -> Result<(), String> {
    state
        .preferences
        .lock()
        .map_err(|_| "Window settings unavailable")?
        .save(behavior)
}
fn restore_window(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<WindowSettings>() {
        state.minimize_generation.fetch_add(1, Ordering::SeqCst);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
fn request_quit_confirmation(app: &tauri::AppHandle) {
    restore_window(app);
    let _ = app.emit("quit-requested", ());
}
fn minimize_window(window: tauri::Window) {
    if !window.is_fullscreen().unwrap_or(false) {
        if let Err(error) = window.minimize() {
            let _ = window.emit("window-error", error.to_string());
        }
        return;
    }
    // macOS cannot miniaturize until the asynchronous fullscreen exit completes.
    let app = window.app_handle().clone();
    let ticket = app
        .state::<WindowSettings>()
        .minimize_generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    if let Err(error) = window.set_fullscreen(false) {
        let _ = window.emit("window-error", error.to_string());
        return;
    }
    std::thread::spawn(move || {
        for _ in 0..30 {
            std::thread::sleep(Duration::from_millis(100));
            if app
                .state::<WindowSettings>()
                .minimize_generation
                .load(Ordering::SeqCst)
                != ticket
            {
                return;
            }
            if window.is_minimized().unwrap_or(false) {
                return;
            }
            if !window.is_fullscreen().unwrap_or(true) {
                let _ = window.minimize();
            }
        }
        if !window.is_minimized().unwrap_or(false) {
            let _ = window.emit(
                "window-error",
                "The window could not be minimized. Try the yellow minimize button.",
            );
        }
    });
}

pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());
    #[cfg(feature = "direct-update")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_workout,
            control_workout,
            read_workout,
            quit_app,
            distribution_channel,
            open_project_page,
            get_close_behavior,
            set_close_behavior,
            updates::check_app_update,
            updates::install_app_update
        ]);
    #[cfg(not(feature = "direct-update"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        start_workout,
        control_workout,
        read_workout,
        quit_app,
        distribution_channel,
        open_project_page,
        get_close_behavior,
        set_close_behavior
    ]);
    builder
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let app = window.app_handle();
                let behavior = app
                    .state::<WindowSettings>()
                    .preferences
                    .lock()
                    .map(|prefs| prefs.behavior)
                    .unwrap_or_default();
                let (installing, active) = app
                    .try_state::<Shared>()
                    .map(|state| {
                        let rt = state.lock().unwrap_or_else(|e| e.into_inner());
                        (
                            rt.update_gate.busy,
                            rt.session.as_ref().is_some_and(Session::active),
                        )
                    })
                    .unwrap_or((false, false));
                match window_behavior::close_action(behavior, installing, active) {
                    window_behavior::CloseAction::Block => {}
                    window_behavior::CloseAction::Minimize => minimize_window(window.clone()),
                    window_behavior::CloseAction::ConfirmQuit => request_quit_confirmation(app),
                    window_behavior::CloseAction::Quit => app.exit(0),
                }
            }
        })
        .setup(|app| {
            app.manage(WindowSettings {
                preferences: Mutex::new(window_behavior::Preferences::load(
                    app.path().app_config_dir()?.join("window.json"),
                )),
                minimize_generation: AtomicU64::new(0),
            });
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
                    restore_window(app);
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
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = &event {
                restore_window(app);
            }
            if let tauri::RunEvent::ExitRequested { api, code, .. } = &event {
                if let Some(state) = app.try_state::<Shared>() {
                    let rt = state.lock().unwrap_or_else(|e| e.into_inner());
                    if !rt.update_gate.allows_exit(*code) {
                        api.prevent_exit();
                        return;
                    }
                    if rt.session.as_ref().is_some_and(Session::active) {
                        api.prevent_exit();
                        request_quit_confirmation(app);
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
