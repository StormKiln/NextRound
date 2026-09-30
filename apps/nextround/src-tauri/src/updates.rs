use crate::{timer::Session, Shared};
use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableUpdate {
    version: String,
    notes: Option<String>,
}

#[tauri::command]
pub async fn check_app_update(app: tauri::AppHandle) -> Result<Option<AvailableUpdate>, String> {
    let update = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    Ok(update.map(|u| AvailableUpdate {
        version: u.version,
        notes: u.body,
    }))
}

#[tauri::command]
pub async fn install_app_update(app: tauri::AppHandle, version: String) -> Result<(), String> {
    let state = app.state::<Shared>();
    {
        let mut rt = state.lock().map_err(|_| "Timer unavailable")?;
        let active = rt.session.as_ref().is_some_and(Session::active);
        rt.update_gate.begin(active)?;
    }
    let result = async {
        let update = app
            .updater_builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?
            .ok_or("No installable update is available.")?;
        if update.version != version {
            return Err("The available version changed. Check for updates again.".into());
        }
        let mut downloaded = 0u64;
        update
            .download_and_install(
                |bytes, total| {
                    downloaded += bytes as u64;
                    let _ = app.emit(
                        "update-progress",
                        serde_json::json!({"downloaded":downloaded,"total":total}),
                    );
                },
                || {
                    let _ = app.emit("update-installing", ());
                },
            )
            .await
            .map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    }
    .await;
    if result.is_err() {
        state
            .lock()
            .map_err(|_| "Timer unavailable")?
            .update_gate
            .busy = false;
    }
    result?;
    state
        .lock()
        .map_err(|_| "Timer unavailable")?
        .update_gate
        .restart_ready = true;
    app.restart();
}
