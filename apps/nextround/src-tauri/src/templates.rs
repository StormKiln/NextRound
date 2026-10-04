use crate::timer::{self, Config};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

static NEXT_ID: AtomicU64 = AtomicU64::new(0);
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkoutTemplate {
    pub id: String,
    pub name: String,
    pub config: Config,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TemplateDocument {
    pub version: u32,
    pub templates: Vec<WorkoutTemplate>,
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "lowercase", deny_unknown_fields)]
pub enum Mutation {
    Save {
        name: String,
        config: Config,
    },
    Update {
        id: String,
        expected: WorkoutTemplate,
        name: String,
        config: Config,
    },
    Rename {
        id: String,
        name: String,
    },
    Delete {
        id: String,
    },
}
pub struct TemplateStore {
    path: PathBuf,
    gate: Mutex<()>,
}
fn name_value(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err("Enter a workout name from 1 to 120 characters.".into());
    }
    Ok(name.into())
}
fn unique_id() -> String {
    format!(
        "{}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos(),
        NEXT_ID.fetch_add(1, Ordering::Relaxed)
    )
}
impl TemplateStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            gate: Mutex::new(()),
        }
    }
    fn read_disk(&self) -> Result<TemplateDocument, String> {
        let raw = match fs::read(&self.path) {
            Ok(raw) => raw,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(TemplateDocument {
                    version: 1,
                    templates: vec![],
                })
            }
            Err(error) => return Err(format!("Cannot read saved workouts: {error}")),
        };
        let document: TemplateDocument = serde_json::from_slice(&raw).map_err(|error| {
            format!("Saved workouts are unreadable; existing data is preserved: {error}")
        })?;
        if document.version != 1 {
            return Err(
                "This saved workout version is unsupported. Existing data is preserved.".into(),
            );
        }
        if document.templates.len() > 100 {
            return Err("Saved workouts exceed the 100 workout limit.".into());
        }
        let mut ids = HashSet::new();
        for entry in &document.templates {
            if entry.id.is_empty() || entry.id.len() > 120 || !ids.insert(&entry.id) {
                return Err("Saved workout identifiers are invalid.".into());
            }
            name_value(&entry.name)?;
            timer::validate(&entry.config)?;
        }
        Ok(document)
    }
    pub fn read(&self) -> Result<TemplateDocument, String> {
        let _guard = self.gate.lock().map_err(|_| "Saved workouts unavailable")?;
        self.read_disk()
    }
    pub fn mutate(&self, mutation: Mutation) -> Result<TemplateDocument, String> {
        let _guard = self.gate.lock().map_err(|_| "Saved workouts unavailable")?;
        // Re-read before every mutation. Corrupt and future data must never be replaced.
        let mut document = self.read_disk()?;
        match mutation {
            Mutation::Save { name, config } => {
                if document.templates.len() >= 100 {
                    return Err(
                        "You can save up to 100 workouts. Delete one before saving another.".into(),
                    );
                }
                timer::validate(&config)?;
                document.templates.push(WorkoutTemplate {
                    id: unique_id(),
                    name: name_value(&name)?,
                    config,
                });
            }
            Mutation::Update {
                id,
                expected,
                name,
                config,
            } => {
                let entry = document.templates.iter_mut().find(|e| e.id == id).ok_or(
                    "This saved workout no longer exists. Save as new to keep your edits.",
                )?;
                if *entry != expected {
                    return Err(
                        "This saved workout changed since you loaded it. Reload it or save as new."
                            .into(),
                    );
                }
                timer::validate(&config)?;
                *entry = WorkoutTemplate {
                    id,
                    name: name_value(&name)?,
                    config,
                };
            }
            Mutation::Rename { id, name } => {
                let entry = document
                    .templates
                    .iter_mut()
                    .find(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                entry.name = name_value(&name)?;
            }
            Mutation::Delete { id } => {
                let index = document
                    .templates
                    .iter()
                    .position(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                document.templates.remove(index);
            }
        }
        atomic_write(
            &self.path,
            &serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?,
        )?;
        Ok(document)
    }
}
pub(crate) fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Saved workout directory unavailable")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(".workout-templates-{}.tmp", unique_id()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| e.to_string())?;
    let result = (|| {
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, path)
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "Cannot save workouts; previous data is preserved: {error}"
        ));
    }
    // Rename is the commit point; a directory-sync failure must not report a rolled-back mutation.
    if let Ok(directory) = fs::File::open(parent) {
        let _ = directory.sync_all();
    }
    Ok(())
}
#[tauri::command]
pub fn read_workout_templates(
    state: tauri::State<'_, TemplateStore>,
) -> Result<TemplateDocument, String> {
    state.read()
}
#[tauri::command]
pub fn mutate_workout_templates(
    mutation: Mutation,
    state: tauri::State<'_, TemplateStore>,
) -> Result<TemplateDocument, String> {
    state.mutate(mutation)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn config() -> Config {
        serde_json::from_value(serde_json::json!({"type":"countdown","durationSeconds":60,"leadInSeconds":0,"warningSeconds":3,"showChecklist":false,"exercises":[{"id":"a","name":"Squat","target":{"unit":"reps","value":5}}]})).unwrap()
    }
    fn store() -> TemplateStore {
        TemplateStore::new(
            std::env::temp_dir()
                .join(format!("nextround-template-test-{}", unique_id()))
                .join("workouts.json"),
        )
    }
    #[test]
    fn interval_save_preserves_legacy_templates_across_restart() {
        let s = store();
        fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        let legacy = serde_json::json!({"version":1,"templates":[
            {"id":"emom","name":"Old EMOM","config":{"minutes":15,"leadInSeconds":10,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat"}]}},
            {"id":"countdown","name":"Old countdown","config":{"type":"countdown","durationSeconds":30,"leadInSeconds":0,"warningSeconds":3}}
        ]});
        fs::write(&s.path, serde_json::to_vec(&legacy).unwrap()).unwrap();
        let before = s.read().unwrap();
        let interval: Config=serde_json::from_value(serde_json::json!({"type":"intervals","workSeconds":40,"restSeconds":20,"rounds":8,"leadInSeconds":10,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat","target":{"unit":"seconds","value":90}}]})).unwrap();
        s.mutate(Mutation::Save {
            name: "Intervals".into(),
            config: interval.clone(),
        })
        .unwrap();
        let after = TemplateStore::new(s.path.clone()).read().unwrap();
        assert_eq!(after.templates.len(), 3);
        for i in 0..2 {
            assert_eq!(before.templates[i].config, after.templates[i].config);
        }
        assert_eq!(after.templates[2].config, interval);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn unknown_nested_source_fields_preserve_original_bytes() {
        for path in [
            vec!["config", "future"],
            vec!["config", "exercises", "0", "future"],
            vec!["config", "exercises", "0", "target", "future"],
        ] {
            let s = store();
            let original = s
                .mutate(Mutation::Save {
                    name: "Original".into(),
                    config: config(),
                })
                .unwrap()
                .templates[0]
                .clone();
            let mut document = serde_json::to_value(s.read().unwrap()).unwrap();
            let mut field = &mut document["templates"][0];
            for key in path {
                field = if key == "0" {
                    &mut field[0]
                } else {
                    &mut field[key]
                };
            }
            *field = serde_json::json!(true);
            let raw = serde_json::to_vec(&document).unwrap();
            fs::write(&s.path, &raw).unwrap();
            assert!(s
                .mutate(Mutation::Update {
                    id: original.id.clone(),
                    expected: original,
                    name: "Changed".into(),
                    config: config()
                })
                .is_err());
            assert_eq!(fs::read(&s.path).unwrap(), raw);
            fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
        }
    }
    #[test]
    fn update_checks_loaded_source_before_atomic_replacement() {
        let s = store();
        let original = s
            .mutate(Mutation::Save {
                name: "Original".into(),
                config: config(),
            })
            .unwrap()
            .templates[0]
            .clone();
        let mut changed = config();
        changed.duration_seconds = Some(45);
        let command = serde_json::json!({"action":"update","id":original.id,"expected":original,"name":"Edited","config":changed});
        let updated = s
            .mutate(serde_json::from_value(command.clone()).unwrap())
            .unwrap();
        assert_eq!(updated.templates.len(), 1);
        assert_eq!(updated.templates[0].id, original.id);
        assert_eq!(updated.templates[0].config.duration_seconds, Some(45));
        let raw = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(serde_json::from_value(command.clone()).unwrap())
            .is_err());
        assert_eq!(fs::read(&s.path).unwrap(), raw);
        s.mutate(Mutation::Delete { id: original.id }).unwrap();
        assert!(s.mutate(serde_json::from_value(command).unwrap()).is_err());
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn persists_restart_and_preserves_countdown_targets() {
        let s = store();
        let saved = s
            .mutate(Mutation::Save {
                name: " Strength ".into(),
                config: config(),
            })
            .unwrap();
        let fresh = TemplateStore::new(s.path.clone()).read().unwrap();
        assert_eq!(fresh.templates[0].name, "Strength");
        assert_eq!(fresh.templates[0].config, config());
        s.mutate(Mutation::Rename {
            id: saved.templates[0].id.clone(),
            name: "Renamed".into(),
        })
        .unwrap();
        assert_eq!(s.read().unwrap().templates[0].name, "Renamed");
        s.mutate(Mutation::Delete {
            id: saved.templates[0].id.clone(),
        })
        .unwrap();
        assert!(s.read().unwrap().templates.is_empty());
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn corrupt_and_future_versions_cannot_be_overwritten() {
        let s = store();
        fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        for raw in [
            "{broken",
            "{\"version\":2,\"templates\":[]}",
            "{\"version\":1,\"templates\":[{}]}",
        ] {
            fs::write(&s.path, raw).unwrap();
            assert!(s.read().is_err());
            assert!(s
                .mutate(Mutation::Save {
                    name: "A".into(),
                    config: config()
                })
                .is_err());
            assert_eq!(fs::read_to_string(&s.path).unwrap(), raw);
        }
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn failed_atomic_rename_preserves_destination_and_removes_temporary_file() {
        let s = store();
        fs::create_dir_all(&s.path).unwrap();
        fs::write(s.path.join("sentinel"), "old data").unwrap();
        assert!(atomic_write(&s.path, b"new data").is_err());
        assert_eq!(
            fs::read_to_string(s.path.join("sentinel")).unwrap(),
            "old data"
        );
        assert_eq!(fs::read_dir(s.path.parent().unwrap()).unwrap().count(), 1);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn serializes_parallel_mutations_and_rejects_invalid_names() {
        let s = std::sync::Arc::new(store());
        let handles: Vec<_> = (0..12)
            .map(|index| {
                let s = s.clone();
                std::thread::spawn(move || {
                    s.mutate(Mutation::Save {
                        name: index.to_string(),
                        config: config(),
                    })
                    .unwrap()
                })
            })
            .collect();
        for handle in handles {
            handle.join().unwrap();
        }
        assert_eq!(s.read().unwrap().templates.len(), 12);
        assert!(s
            .mutate(Mutation::Save {
                name: " ".into(),
                config: config()
            })
            .is_err());
        assert_eq!(s.read().unwrap().templates.len(), 12);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
}
