use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};
const INVALID: &str =
    "Personal exercises are unreadable or unsupported. Existing data has been preserved.";
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "lowercase", deny_unknown_fields)]
pub enum Mutation {
    Save {
        exercise: Value,
        expected: Option<Value>,
    },
}
pub struct ExerciseStore {
    path: PathBuf,
    gate: Mutex<()>,
}
fn keys(v: &Value, allowed: &[&str]) -> Result<(), String> {
    let o = v.as_object().ok_or(INVALID)?;
    if o.keys().any(|k| !allowed.contains(&k.as_str())) {
        return Err(INVALID.into());
    }
    Ok(())
}
fn text(v: &Value, min: usize, max: usize) -> bool {
    v.as_str()
        .is_some_and(|s| s.trim().encode_utf16().count() >= min && s.encode_utf16().count() <= max)
}
fn list(v: &Value, allowed: &[&str], required: bool) -> Result<(), String> {
    let a = v.as_array().ok_or(INVALID)?;
    let mut seen = HashSet::new();
    if (required && a.is_empty())
        || a.iter().any(|x| {
            x.as_str()
                .is_none_or(|s| !allowed.contains(&s) || !seen.insert(s))
        })
    {
        return Err(INVALID.into());
    }
    Ok(())
}
fn validate_document(v: &Value) -> Result<(), String> {
    keys(v, &["version", "exercises"])?;
    if v["version"] != 1 {
        return Err(INVALID.into());
    }
    let entries = v["exercises"].as_array().ok_or(INVALID)?;
    if entries.len() > 500 {
        return Err(INVALID.into());
    }
    let mut ids = HashSet::new();
    for e in entries {
        keys(
            e,
            &[
                "id",
                "name",
                "description",
                "category",
                "equipment",
                "targetAreas",
                "supportedUnits",
                "defaultTarget",
                "sourceId",
                "archived",
            ],
        )?;
        let id = e["id"].as_str().ok_or(INVALID)?;
        if !id.strip_prefix("personal:").is_some_and(|s| {
            !s.is_empty() && s.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
        }) || id.len() > 120
            || !ids.insert(id)
            || !text(&e["name"], 1, 120)
            || !text(&e["description"], 0, 2000)
            || !e["archived"].is_boolean()
            || !e["category"].as_str().is_some_and(|s| {
                [
                    "Kettlebell",
                    "Dumbbell",
                    "Push-ups",
                    "Planks",
                    "Squats",
                    "Cardio",
                    "Other bodyweight",
                    "Other equipment",
                    "Uncategorized",
                ]
                .contains(&s)
            })
        {
            return Err(INVALID.into());
        }
        list(
            &e["equipment"],
            &[
                "kettlebell",
                "dumbbell",
                "jump-rope",
                "rower",
                "raised-surface",
                "jump-box",
                "pullup-bar",
                "slam-ball",
            ],
            false,
        )?;
        list(
            &e["targetAreas"],
            &[
                "legs",
                "glutes",
                "core",
                "arms",
                "shoulders",
                "chest",
                "back",
                "lats",
                "whole-body",
            ],
            false,
        )?;
        list(
            &e["supportedUnits"],
            &["reps", "seconds", "metres", "calories"],
            true,
        )?;
        if e.get("sourceId").is_some_and(|s| !text(s, 1, 120)) {
            return Err(INVALID.into());
        }
        if let Some(t) = e.get("defaultTarget") {
            keys(t, &["unit", "value"])?;
            let max = if t["unit"] == "seconds" {
                86400.0
            } else {
                999999.0
            };
            if !e["supportedUnits"].as_array().unwrap().contains(&t["unit"])
                || !t["value"]
                    .as_f64()
                    .is_some_and(|n| n >= 1.0 && n <= max && n.fract() == 0.0)
            {
                return Err("Choose a supported target unit and a positive whole value.".into());
            }
        }
    }
    Ok(())
}
impl ExerciseStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            gate: Mutex::new(()),
        }
    }
    fn read_disk(&self) -> Result<Value, String> {
        let raw = match fs::read(&self.path) {
            Ok(raw) => raw,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(json!({"version":1,"exercises":[]}))
            }
            Err(e) => return Err(format!("Cannot read personal exercises: {e}")),
        };
        let document: Value = serde_json::from_slice(&raw).map_err(|_| INVALID)?;
        validate_document(&document)?;
        Ok(document)
    }
    pub fn read(&self) -> Result<Value, String> {
        let _guard = self.gate.lock().map_err(|_| INVALID)?;
        self.read_disk()
    }
    pub fn mutate(&self, mutation: Mutation) -> Result<Value, String> {
        let _guard = self.gate.lock().map_err(|_| INVALID)?;
        let mut document = self.read_disk()?;
        let Mutation::Save { exercise, expected } = mutation;
        validate_document(&json!({"version":1,"exercises":[exercise]}))?;
        if let Some(ref previous) = expected {
            validate_document(&json!({"version":1,"exercises":[previous]}))?;
        }
        let entries = document["exercises"].as_array_mut().ok_or(INVALID)?;
        if let Some(index) = entries.iter().position(|e| e["id"] == exercise["id"]) {
            if entries[index] == exercise {
                return Ok(document);
            }
            if expected.as_ref() != Some(&entries[index]) {
                return Err(
                    "This exercise changed. Close and reopen it to load the latest version.".into(),
                );
            }
            entries[index] = exercise;
        } else {
            if expected.is_some() {
                return Err("This exercise no longer exists. Reload the library.".into());
            }
            if entries.len() >= 500 {
                return Err(
                    "The personal library limit is 500 exercises, including archived entries."
                        .into(),
                );
            }
            entries.push(exercise);
        }
        crate::templates::atomic_write(
            &self.path,
            &serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?,
        )?;
        Ok(document)
    }
}
#[tauri::command]
pub fn read_personal_exercises(state: tauri::State<'_, ExerciseStore>) -> Result<Value, String> {
    state.read()
}
#[tauri::command]
pub fn mutate_personal_exercises(
    mutation: Mutation,
    state: tauri::State<'_, ExerciseStore>,
) -> Result<Value, String> {
    state.mutate(mutation)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn entry(id: &str) -> serde_json::Value {
        serde_json::json!({"id":id,"name":"My squat","description":"","category":"Squats","equipment":[],"targetAreas":["legs"],"supportedUnits":["reps"],"archived":false})
    }
    static TEST_ID: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    fn store() -> ExerciseStore {
        ExerciseStore::new(
            std::env::temp_dir()
                .join(format!(
                    "nextround-personal-{}-{}",
                    TEST_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos()
                ))
                .join("personal.json"),
        )
    }
    fn save(exercise: serde_json::Value, expected: Option<serde_json::Value>) -> Mutation {
        serde_json::from_value(
            serde_json::json!({"action":"save","exercise":exercise,"expected":expected}),
        )
        .unwrap()
    }
    #[test]
    fn personal_restart_retry_conflict_archive_and_snapshot() {
        let s = store();
        let a = entry("personal:a");
        s.mutate(save(a.clone(), None)).unwrap();
        s.mutate(save(a.clone(), None)).unwrap();
        s.mutate(save(entry("personal:b"), None)).unwrap();
        assert_eq!(
            ExerciseStore::new(s.path.clone()).read().unwrap()["exercises"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        let mut edited = a.clone();
        edited["name"] = serde_json::json!("Renamed");
        edited["archived"] = serde_json::json!(true);
        s.mutate(save(edited.clone(), Some(a.clone()))).unwrap();
        let raw = std::fs::read(&s.path).unwrap();
        assert!(s
            .mutate(save(entry("personal:a"), Some(a.clone())))
            .is_err());
        assert_eq!(std::fs::read(&s.path).unwrap(), raw);
        let mut restored = edited.clone();
        restored["archived"] = serde_json::json!(false);
        s.mutate(save(restored, Some(edited))).unwrap();
        assert_eq!(a["name"], "My squat");
        std::fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn personal_invalid_future_and_corrupt_documents_preserve_bytes() {
        let s = store();
        std::fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        for raw in [
            "{broken".to_string(),
            serde_json::json!({"version":2,"exercises":[]}).to_string(),
            serde_json::json!({"version":1,"exercises":[{"id":"squat"}]}).to_string(),
        ] {
            std::fs::write(&s.path, &raw).unwrap();
            assert!(s.read().is_err());
            assert!(s.mutate(save(entry("personal:a"), None)).is_err());
            assert_eq!(std::fs::read_to_string(&s.path).unwrap(), raw);
        }
        std::fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn personal_validation_matches_browser() {
        for patch in [
            serde_json::json!({"id":"squat"}),
            serde_json::json!({"future":true}),
            serde_json::json!({"supportedUnits":[]}),
            serde_json::json!({"equipment":["unknown"]}),
            serde_json::json!({"targetAreas":["unknown"]}),
            serde_json::json!({"defaultTarget":{"unit":"seconds","value":30}}),
            serde_json::json!({"defaultTarget":{"unit":"reps","value":5,"future":true}}),
        ] {
            let mut a = entry("personal:a");
            a.as_object_mut()
                .unwrap()
                .extend(patch.as_object().unwrap().clone());
            assert!(validate_document(&serde_json::json!({"version":1,"exercises":[a]})).is_err());
        }
    }
    #[test]
    fn personal_cap_and_failed_write_preserve_existing_data() {
        let s = store();
        fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        let entries: Vec<_> = (0..500)
            .map(|i| {
                let mut e = entry(&format!("personal:{i}"));
                e["archived"] = json!(true);
                e
            })
            .collect();
        let raw = json!({"version":1,"exercises":entries}).to_string();
        fs::write(&s.path, &raw).unwrap();
        assert!(s.mutate(save(entry("personal:extra"), None)).is_err());
        assert_eq!(fs::read_to_string(&s.path).unwrap(), raw);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
        fs::create_dir_all(&s.path).unwrap();
        fs::write(s.path.join("sentinel"), "existing").unwrap();
        assert!(s.mutate(save(entry("personal:extra"), None)).is_err());
        assert_eq!(
            fs::read_to_string(s.path.join("sentinel")).unwrap(),
            "existing"
        );
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn personal_parallel_writes_are_serialized() {
        let s = std::sync::Arc::new(store());
        let handles: Vec<_> = (0..12)
            .map(|i| {
                let s = s.clone();
                std::thread::spawn(move || {
                    s.mutate(save(entry(&format!("personal:{i}")), None))
                        .unwrap()
                })
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }
        assert_eq!(s.read().unwrap()["exercises"].as_array().unwrap().len(), 12);
        std::fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
}
