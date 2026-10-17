use crate::{
    exercises::ExerciseStore,
    history::HistoryStore,
    templates::{atomic_write, TemplateStore},
    training::TrainingStore,
};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
use tauri::Manager;
const LIMIT: usize = 32 * 1024 * 1024;
pub(crate) struct Transaction {
    data: PathBuf,
    config: PathBuf,
}
impl Transaction {
    pub(crate) fn new(data: PathBuf, config: PathBuf) -> Self {
        Self { data, config }
    }
    fn journal(&self) -> PathBuf {
        self.data.join("restore-journal-v1.json")
    }
    fn paths(&self) -> [(&'static str, PathBuf); 5] {
        [
            ("templates", self.data.join("workout-templates.json")),
            ("history", self.data.join("workout-history.json")),
            ("personal", self.data.join("personal-exercises.json")),
            ("training", self.data.join("training-v1.json")),
            ("window", self.config.join("window.json")),
        ]
    }
    fn snapshot(&self, preferences: Value) -> Result<Value, String> {
        let window = match fs::read(self.config.join("window.json")) {
            Ok(raw) => serde_json::from_slice(&raw)
                .map_err(|e| format!("Window preferences unreadable: {e}"))?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                json!({"version":1,"closeBehavior":"minimize"})
            }
            Err(e) => return Err(e.to_string()),
        };
        Ok(
            json!({"templates":TemplateStore::new(self.data.join("workout-templates.json")).read()?,"history":HistoryStore::new(self.data.join("workout-history.json")).read()?,"personal":ExerciseStore::new(self.data.join("personal-exercises.json")).read()?,"training":TrainingStore::new(self.data.join("training-v1.json")).read_disk()?,"window":window,"preferences":preferences}),
        )
    }
    fn apply(
        &self,
        value: &Value,
        mut after: impl FnMut(usize) -> Result<(), String>,
    ) -> Result<(), String> {
        for (index, (key, path)) in self.paths().iter().enumerate() {
            let bytes = serde_json::to_vec(&value[key]).map_err(|e| e.to_string())?;
            atomic_write(path, &bytes)?;
            after(index)?;
        }
        Ok(())
    }
    fn validate(&self, value: &Value) -> Result<(), String> {
        let v = value.as_object().ok_or("Invalid backup dataset")?;
        if v.len() != 6
            || ![
                "templates",
                "history",
                "personal",
                "training",
                "window",
                "preferences",
            ]
            .iter()
            .all(|k| v.contains_key(*k))
            || serde_json::to_vec(value).map_err(|e| e.to_string())?.len() > LIMIT
        {
            return Err("Invalid or oversized backup dataset".into());
        }
        if value["window"]["version"] != 1
            || !matches!(
                value["window"]["closeBehavior"].as_str(),
                Some("minimize" | "quit")
            )
            || !value["training"]["recovery"].is_null()
        {
            return Err("Invalid preferences or unresolved session in backup".into());
        }
        let prefs = value["preferences"]
            .as_object()
            .ok_or("Invalid backup preferences")?;
        for (k, v) in prefs {
            if ![
                "nextround.equipment.v1",
                "nextround.exercise-favorites.v1",
                "nextround.preferences.v1",
            ]
            .contains(&k.as_str())
                || !v.is_string()
            {
                return Err("Unsupported backup preference".into());
            }
        }
        // Reuse the actual legacy repository readers to validate every legacy record.
        let stage = self.data.join("restore-validation");
        if stage.exists() {
            fs::remove_dir_all(&stage).map_err(|e| e.to_string())?;
        }
        fs::create_dir_all(&stage).map_err(|e| e.to_string())?;
        let validation = Transaction::new(stage.clone(), stage.join("config"));
        let result = (|| {
            validation.apply(value, |_| Ok(()))?;
            validation.snapshot(value["preferences"].clone())?;
            Ok(())
        })();
        let _ = fs::remove_dir_all(stage);
        result
    }
    fn restore(
        &self,
        next: Value,
        preferences: Value,
        keep_rollback: bool,
        mut after: impl FnMut(usize) -> Result<(), String>,
    ) -> Result<(), String> {
        if self.journal().exists() {
            return Err("Finish the pending restore before starting another.".into());
        }
        self.validate(&next)?;
        let previous = self.snapshot(preferences)?;
        self.validate(&previous)?;
        if keep_rollback {
            atomic_write(
                &self.data.join("last-restore-rollback.json"),
                &serde_json::to_vec(&previous).map_err(|e| e.to_string())?,
            )?;
        }
        let mut journal = json!({"version":1,"committed":false,"previous":previous,"next":next});
        atomic_write(
            &self.journal(),
            &serde_json::to_vec(&journal).map_err(|e| e.to_string())?,
        )?;
        let commit = (|| {
            self.apply(&journal["next"], &mut after)?;
            after(5)?;
            journal["committed"] = json!(true);
            atomic_write(
                &self.journal(),
                &serde_json::to_vec(&journal).map_err(|e| e.to_string())?,
            )
        })();
        if let Err(error) = commit {
            self.apply(&journal["previous"], |_|Ok(())).map_err(|rollback|format!("Restore failed ({error}); rollback needs recovery ({rollback}). Restart NextRound before continuing."))?;
            fs::remove_file(self.journal()).map_err(|e| e.to_string())?;
            return Err(format!("Restore failed; previous data restored: {error}"));
        }
        Ok(())
    }
    pub(crate) fn recover(&self) -> Result<Option<Value>, String> {
        let raw = match fs::read(self.journal()) {
            Ok(raw) => raw,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.to_string()),
        };
        if raw.len() > LIMIT * 2 + 1024 {
            return Err("Restore journal is oversized; existing files preserved.".into());
        }
        let journal: Value =
            serde_json::from_slice(&raw).map_err(|e| format!("Restore journal unreadable: {e}"))?;
        if journal["version"] != 1 || !journal["committed"].is_boolean() {
            return Err("Unsupported restore journal; existing files preserved.".into());
        }
        if journal["committed"] == true {
            Ok(Some(journal["next"]["preferences"].clone()))
        } else {
            self.validate(&journal["previous"])?;
            self.apply(&journal["previous"], |_| Ok(()))?;
            fs::remove_file(self.journal()).map_err(|e| e.to_string())?;
            Ok(None)
        }
    }
}
fn transaction(app: &tauri::AppHandle) -> Result<Transaction, String> {
    Ok(Transaction::new(
        app.path().app_data_dir().map_err(|e| e.to_string())?,
        app.path().app_config_dir().map_err(|e| e.to_string())?,
    ))
}
fn with_stores<T>(
    app: &tauri::AppHandle,
    action: impl FnOnce(Transaction) -> Result<T, String>,
) -> Result<T, String> {
    let rt = app.state::<crate::Shared>();
    let mut runtime = rt.lock().map_err(|_| "Timer unavailable")?;
    runtime.update();
    if runtime.training_active
        || runtime.note_editing
        || runtime.update_gate.busy
        || runtime
            .session
            .as_ref()
            .is_some_and(|s| s.active() || s.needs_result_decision())
    {
        return Err(
            "Finish your workout and resolve unsaved results or notes before backup/restore."
                .into(),
        );
    }
    let templates = app.state::<TemplateStore>();
    let _t = templates.gate.lock().map_err(|_| "Templates unavailable")?;
    let history = app.state::<HistoryStore>();
    let _h = history.gate.lock().map_err(|_| "History unavailable")?;
    let personal = app.state::<ExerciseStore>();
    let _p = personal.gate.lock().map_err(|_| "Exercises unavailable")?;
    let training = app.state::<TrainingStore>();
    let _s = training.gate.lock().map_err(|_| "Training unavailable")?;
    action(transaction(app)?)
}
#[tauri::command]
pub fn backup_snapshot(app: tauri::AppHandle, preferences: Value) -> Result<Value, String> {
    with_stores(&app, |t| t.snapshot(preferences))
}
#[tauri::command]
pub fn restore_backup(
    app: tauri::AppHandle,
    next: Value,
    preferences: Value,
) -> Result<(), String> {
    with_stores(&app, |t| t.restore(next, preferences, true, |_| Ok(())))
}
#[tauri::command]
pub fn pending_restore_preferences(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    transaction(&app)?.recover()
}
#[tauri::command]
pub fn acknowledge_restore(app: tauri::AppHandle) -> Result<(), String> {
    let t = transaction(&app)?;
    if t.recover()?.is_some() {
        let settings = app.state::<crate::WindowSettings>();
        let mut preferences = settings
            .preferences
            .lock()
            .map_err(|_| "Window settings unavailable")?;
        *preferences = crate::window_behavior::Preferences::load(t.config.join("window.json"));
        fs::remove_file(t.journal()).map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
pub fn read_backup_rollback(app: tauri::AppHandle) -> Result<Value, String> {
    let raw = fs::read(transaction(&app)?.data.join("last-restore-rollback.json"))
        .map_err(|_| "No previous restore copy is available.")?;
    serde_json::from_slice(&raw).map_err(|e| e.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restores_all_files_or_rolls_back_after_a_partial_write() {
        let dir =
            std::env::temp_dir().join(format!("nextround-backup-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let store = Transaction::new(dir.clone(), dir.join("config"));
        let before = store.snapshot(serde_json::json!({})).unwrap();
        let mut after = before.clone();
        after["window"]["closeBehavior"] = serde_json::json!("quit");
        assert!(store
            .restore(after, serde_json::json!({}), true, |i| if i == 2 {
                Err("disk full".into())
            } else {
                Ok(())
            })
            .is_err());
        assert_eq!(store.snapshot(serde_json::json!({})).unwrap(), before);
        assert!(!store.journal().exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn failure_before_commit_marker_rolls_back_and_crash_recovery_resolves_journal() {
        let dir = std::env::temp_dir().join(format!(
            "nextround-backup-commit-test-{}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).unwrap();
        let store = Transaction::new(dir.clone(), dir.join("config"));
        let before = store.snapshot(json!({})).unwrap();
        let mut next = before.clone();
        next["window"]["closeBehavior"] = json!("quit");
        assert!(store
            .restore(next.clone(), json!({}), true, |i| if i == 5 {
                Err("commit unavailable".into())
            } else {
                Ok(())
            })
            .is_err());
        assert_eq!(store.snapshot(json!({})).unwrap(), before);
        let prepared = json!({"version":1,"committed":false,"previous":before,"next":next});
        store.apply(&next, |_| Ok(())).unwrap();
        atomic_write(&store.journal(), &serde_json::to_vec(&prepared).unwrap()).unwrap();
        assert_eq!(store.recover().unwrap(), None);
        assert_eq!(store.snapshot(json!({})).unwrap(), before);
        store
            .restore(next.clone(), json!({}), true, |_| Ok(()))
            .unwrap();
        assert_eq!(store.recover().unwrap(), Some(json!({})));
        assert_eq!(store.snapshot(json!({})).unwrap(), next);
        fs::remove_dir_all(dir).unwrap();
    }
}

#[tauri::command]
pub fn write_library_batch(
    app: tauri::AppHandle,
    expected: Value,
    next: Value,
    preferences: Value,
) -> Result<(), String> {
    with_stores(&app, |t| {
        let mut snapshot = t.snapshot(preferences.clone())?;
        if snapshot["templates"] != expected["templates"]
            || snapshot["training"] != expected["training"]
        {
            return Err("Library changed. Refresh and retry import.".into());
        }
        snapshot["templates"] = next["templates"].clone();
        snapshot["training"] = next["training"].clone();
        t.restore(snapshot, preferences, false, |_| Ok(()))
    })
}
