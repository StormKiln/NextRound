mod exercises;
use tauri_plugin_opener::OpenerExt;
mod audio;
mod backup;
mod history;
mod history_export;
mod spotify;
mod templates;
pub mod timer;
mod training;
mod update_gate;
#[cfg(feature = "direct-update")]
mod updates;
mod window_behavior;
mod workout_files;
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
    note_editing: bool,
    training_active: bool,
    training_awake: bool,
    training_final: bool,
    training_silent: bool,
    session: Option<Session>,
    update_gate: update_gate::UpdateGate,
    audio: Audio,
    spotify: spotify::Link,
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
            if let Some(cue) = timer::training_cue(
                cue,
                self.training_active,
                self.training_final,
                self.training_silent,
            ) {
                if let Err(error) = self.audio.play(cue) {
                    session.notice = Some(error);
                }
            }
            if let Err(error) = self
                .audio
                .keep_awake(self.training_awake || (session.active() && !session.paused))
            {
                session.notice = Some(error);
            }
        }
        self.sync_spotify();
    }
    fn sync_spotify(&mut self) {
        let snapshot = self.session.as_ref().map(Session::snapshot);
        self.spotify.sync(spotify::desired(
            snapshot.as_ref().map(|s| s.phase.as_str()),
            snapshot.as_ref().is_some_and(|s| s.paused),
            self.training_active && !self.training_final,
        ));
    }
}
type Shared = Arc<Mutex<Runtime>>;

#[tauri::command]
fn start_workout(
    app: tauri::AppHandle,
    config: Config,
    state: State<'_, Shared>,
) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    backup::ensure_app_ready(&app)?;
    rt.update();
    if rt.update_gate.busy {
        return Err("An update is being installed. Wait for NextRound to restart.".into());
    }
    if rt.session.as_ref().is_some_and(Session::active) {
        return Err("A workout is already active.".into());
    }
    if rt
        .session
        .as_ref()
        .is_some_and(Session::needs_result_decision)
    {
        return Err(
            "Save or discard your completed result before starting another workout.".into(),
        );
    }
    let mut session = Session::new(config)?;
    if let Some(cue) = timer::training_cue(
        timer::cue_at(&session.config, 0),
        rt.training_active,
        rt.training_final,
        rt.training_silent,
    ) {
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
    rt.sync_spotify();
    Ok(result)
}
#[tauri::command]
fn set_training_guard(
    active: bool,
    awake: bool,
    final_block: bool,
    silent: bool,
    state: State<'_, Shared>,
) -> Result<(), String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    if active && rt.update_gate.busy {
        return Err("Wait for the update to finish.".into());
    }
    rt.training_active = active;
    rt.training_awake = active && awake;
    rt.training_final = final_block;
    rt.training_silent = silent;
    rt.audio.keep_awake(active && awake)?;
    Ok(())
}
#[tauri::command]
fn restore_workout(
    app: tauri::AppHandle,
    config: Config,
    elapsed: u64,
    completed_movements: u32,
    state: State<'_, Shared>,
) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    backup::ensure_app_ready(&app)?;
    if rt.update_gate.busy
        || rt
            .session
            .as_ref()
            .is_some_and(|s| s.active() || s.needs_result_decision())
    {
        return Err("Resolve the current workout before recovery.".into());
    }
    let session = Session::restore(config, elapsed, completed_movements)?;
    let snapshot = session.snapshot();
    rt.audio.stop();
    rt.audio.keep_awake(false)?;
    rt.session = Some(session);
    rt.last = Instant::now();
    rt.wall = SystemTime::now();
    rt.remainder = Duration::ZERO;
    rt.sync_spotify();
    Ok(snapshot)
}
#[tauri::command]
fn control_workout(action: String, state: State<'_, Shared>) -> Result<Snapshot, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    let session = rt.session.as_mut().ok_or("No active workout")?;
    let mut movement_cue = None;
    match action.as_str() {
        "pause" if session.active() => session.paused = true,
        "resume" if session.active() => {
            session.paused = false;
            session.notice = None;
        }
        "stop" => session.stop()?,
        "finish" => session.finish()?,
        "advance" => movement_cue = session.progress(false)?,
        "undo" => movement_cue = session.progress(true)?,
        _ => return Err("This action is not available.".into()),
    }
    let result = session.snapshot();
    rt.audio.stop();
    if let Some(cue) = timer::training_cue(
        if action == "finish" {
            Some("complete")
        } else {
            movement_cue
        },
        rt.training_active,
        rt.training_final,
        rt.training_silent,
    ) {
        if let Err(error) = rt.audio.play(cue) {
            if let Some(session) = rt.session.as_mut() {
                session.notice = Some(error);
            }
        }
    }
    if let Err(error) = rt
        .audio
        .keep_awake(!result.paused && result.phase != "cancelled" && result.phase != "completed")
    {
        if let Some(session) = rt.session.as_mut() {
            session.notice = Some(error);
        }
    }
    rt.sync_spotify();
    Ok(result)
}
#[tauri::command]
fn read_workout(state: State<'_, Shared>) -> Result<Option<Snapshot>, String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    rt.update();
    Ok(rt.session.as_ref().map(Session::snapshot))
}

#[tauri::command]
fn resolve_workout_result(state: State<'_, Shared>) -> Result<(), String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    let session = rt.session.as_mut().ok_or("No completed workout")?;
    if session.snapshot().phase != "completed" {
        return Err("No completed workout".into());
    }
    session.result_resolved = true;
    Ok(())
}

#[tauri::command]
fn set_history_note_editing(editing: bool, state: State<'_, Shared>) -> Result<(), String> {
    let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
    if editing && rt.update_gate.busy {
        return Err("Wait for the update to finish before editing a note.".into());
    }
    rt.note_editing = editing;
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle, state: State<'_, Shared>) -> Result<(), String> {
    {
        let rt = state.lock().map_err(|_| "Timer unavailable")?;
        if rt.training_active
            || rt.note_editing
            || rt
                .session
                .as_ref()
                .is_some_and(|s| s.active() || s.needs_result_decision())
        {
            return Err(
                "Stop your workout or save/discard its completed result before quitting.".into(),
            );
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
        "privacy" => "https://github.com/StormKiln/NextRound/blob/main/PRIVACY.md",
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
    app: tauri::AppHandle,
    state: State<WindowSettings>,
    behavior: window_behavior::CloseBehavior,
) -> Result<(), String> {
    let shared = app.state::<Shared>();
    let _runtime = shared.lock().map_err(|_| "Timer unavailable")?;
    backup::ensure_app_ready(&app)?;
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
            set_training_guard,
            restore_workout,
            backup::write_library_batch,
            backup::write_history_batch,
            backup::backup_snapshot,
            backup::restore_backup,
            backup::has_pending_restore,
            backup::pending_restore_preferences,
            backup::acknowledge_restore,
            backup::read_backup_rollback,
            workout_files::open_backup_file,
            workout_files::save_backup_file,
            training::read_training,
            training::write_training,
            start_workout,
            control_workout,
            read_workout,
            quit_app,
            set_history_note_editing,
            resolve_workout_result,
            distribution_channel,
            open_project_page,
            get_close_behavior,
            set_close_behavior,
            spotify::spotify_settings,
            spotify::set_spotify_enabled,
            spotify::spotify_now_playing,
            history::read_workout_history,
            history_export::save_history_csv,
            workout_files::open_workout_file,
            workout_files::save_workout_file,
            history::mutate_workout_history,
            exercises::read_personal_exercises,
            exercises::mutate_personal_exercises,
            templates::read_workout_templates,
            templates::mutate_workout_templates,
            updates::check_app_update,
            updates::install_app_update
        ]);
    #[cfg(not(feature = "direct-update"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        set_training_guard,
        restore_workout,
        backup::write_library_batch,
        backup::write_history_batch,
        backup::backup_snapshot,
        backup::restore_backup,
        backup::has_pending_restore,
        backup::pending_restore_preferences,
        backup::acknowledge_restore,
        backup::read_backup_rollback,
        workout_files::open_backup_file,
        workout_files::save_backup_file,
        training::read_training,
        training::write_training,
        start_workout,
        control_workout,
        read_workout,
        quit_app,
        set_history_note_editing,
        resolve_workout_result,
        distribution_channel,
        open_project_page,
        get_close_behavior,
        set_close_behavior,
        spotify::spotify_settings,
        spotify::set_spotify_enabled,
        spotify::spotify_now_playing,
        history::read_workout_history,
        history_export::save_history_csv,
        workout_files::open_workout_file,
        workout_files::save_workout_file,
        history::mutate_workout_history,
        exercises::read_personal_exercises,
        exercises::mutate_personal_exercises,
        templates::read_workout_templates,
        templates::mutate_workout_templates
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
                            rt.training_active
                                || rt.note_editing
                                || rt
                                    .session
                                    .as_ref()
                                    .is_some_and(|s| s.active() || s.needs_result_decision()),
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
            backup::Transaction::new(app.path().app_data_dir()?, app.path().app_config_dir()?)
                .recover()
                .map_err(std::io::Error::other)?;
            app.manage(training::TrainingStore::new(
                app.path().app_data_dir()?.join("training-v1.json"),
            ));
            app.manage(history::HistoryStore::new(
                app.path().app_data_dir()?.join("workout-history.json"),
            ));
            app.manage(exercises::ExerciseStore::new(
                app.path().app_data_dir()?.join("personal-exercises.json"),
            ));
            app.manage(templates::TemplateStore::new(
                app.path().app_data_dir()?.join("workout-templates.json"),
            ));
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
            let spotify = spotify::Spotify::load(app.path().app_config_dir()?.join("spotify.json"));
            app.manage(spotify.clone());
            let runtime = Arc::new(Mutex::new(Runtime {
                note_editing: false,
                training_active: false,
                training_awake: false,
                training_final: false,
                training_silent: false,
                session: None,
                update_gate: update_gate::UpdateGate::default(),
                audio,
                spotify: spotify::Link::new(spotify),
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
                    if rt.training_active
                        || rt.note_editing
                        || rt
                            .session
                            .as_ref()
                            .is_some_and(|s| s.active() || s.needs_result_decision())
                    {
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
