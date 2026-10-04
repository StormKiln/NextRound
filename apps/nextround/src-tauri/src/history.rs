use crate::{
    templates::atomic_write,
    timer::{self, Config, Mode},
};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkoutResult {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amrap_progress: Option<AmrapProgress>,
    pub id: String,
    pub completed_at: u64,
    pub elapsed_ms: u64,
    pub config: Config,
    pub checked_exercise_ids: Vec<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AmrapProgress {
    pub completed_movements: u32,
    pub partial_value: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HistoryDocument {
    pub version: u32,
    pub results: Vec<WorkoutResult>,
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "lowercase", deny_unknown_fields)]
pub enum Mutation {
    Save { result: WorkoutResult },
    Delete { id: String },
}
pub struct HistoryStore {
    path: PathBuf,
    gate: Mutex<()>,
}
fn validate_result(result: &WorkoutResult) -> Result<(), String> {
    timer::validate(&result.config)?;
    match (&result.config.mode, &result.amrap_progress) {
        (Mode::Amrap, Some(score)) if score.completed_movements <= 999999 => {
            let current = &result.config.exercises
                [score.completed_movements as usize % result.config.exercises.len()];
            if !current
                .target
                .as_ref()
                .is_some_and(|t| score.partial_value < t.value)
            {
                return Err("Invalid AMRAP partial progress.".into());
            }
        }
        (Mode::Amrap, _) => return Err("AMRAP result requires valid progress.".into()),
        (_, Some(_)) => return Err("Progress applies only to AMRAP.".into()),
        _ => {}
    }
    let mut checked = HashSet::new();
    if result.id.trim().is_empty()
        || result.id.chars().count() > 120
        || result.completed_at == 0
        || result.completed_at > 8_640_000_000_000_000
        || if result.config.mode == Mode::ForTime {
            result.elapsed_ms > 9_007_199_254_740_991
                || match result.outcome.as_deref() {
                    Some("finished") => result.elapsed_ms >= result.config.duration_ms(),
                    Some("timeCapReached") => {
                        result.config.time_cap_seconds.is_none()
                            || result.elapsed_ms != result.config.duration_ms()
                    }
                    _ => true,
                }
        } else {
            result.outcome.is_some() || result.elapsed_ms != result.config.duration_ms()
        }
        || result.checked_exercise_ids.iter().any(|id| {
            !checked.insert(id)
                || !matches!(result.config.mode, Mode::Countdown | Mode::ForTime)
                || result.config.show_checklist == Some(false)
                || !result.config.exercises.iter().any(|e| &e.id == id)
        })
    {
        return Err("Invalid workout result; existing history is preserved.".into());
    }
    Ok(())
}
impl HistoryStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            gate: Mutex::new(()),
        }
    }
    fn read_disk(&self) -> Result<HistoryDocument, String> {
        let raw = match fs::read(&self.path) {
            Ok(raw) => raw,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(HistoryDocument {
                    version: 1,
                    results: vec![],
                })
            }
            Err(e) => return Err(format!("Cannot read workout history: {e}")),
        };
        let document: HistoryDocument = serde_json::from_slice(&raw).map_err(|e| {
            format!("Workout history is unreadable; existing data is preserved: {e}")
        })?;
        if document.version != 1 {
            return Err(
                "This workout history version is unsupported. Existing data is preserved.".into(),
            );
        }
        let mut ids = HashSet::new();
        for result in &document.results {
            validate_result(result)?;
            if !ids.insert(&result.id) {
                return Err("Duplicate history identifiers; existing data is preserved.".into());
            }
        }
        Ok(document)
    }
    pub fn read(&self) -> Result<HistoryDocument, String> {
        let _guard = self.gate.lock().map_err(|_| "History unavailable")?;
        self.read_disk()
    }
    pub fn mutate(&self, mutation: Mutation) -> Result<HistoryDocument, String> {
        let _guard = self.gate.lock().map_err(|_| "History unavailable")?;
        let mut document = self.read_disk()?;
        match mutation {
            Mutation::Save { result } => {
                validate_result(&result)?;
                if let Some(existing) = document.results.iter().find(|r| r.id == result.id) {
                    if existing != &result {
                        return Err("This session is already saved with different data.".into());
                    }
                    return Ok(document);
                }
                document.results.push(result);
            }
            Mutation::Delete { id } => {
                let index = document
                    .results
                    .iter()
                    .position(|r| r.id == id)
                    .ok_or("This result no longer exists. Refresh and try again.")?;
                document.results.remove(index);
            }
        }
        atomic_write(
            &self.path,
            &serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?,
        )?;
        Ok(document)
    }
}
#[tauri::command]
pub fn read_workout_history(
    state: tauri::State<'_, HistoryStore>,
) -> Result<HistoryDocument, String> {
    state.read()
}
#[tauri::command]
pub fn mutate_workout_history(
    mutation: Mutation,
    state: tauri::State<'_, HistoryStore>,
) -> Result<HistoryDocument, String> {
    state.mutate(mutation)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn amrap_score_roundtrips_and_rejects_invalid_partial_units() {
        let raw = serde_json::json!({"id":"amrap", "completedAt":1780000000000u64,"elapsedMs":60000,"checkedExerciseIds":[], "amrapProgress":{"completedMovements":3,"partialValue":40},"config":{"type":"amrap","durationSeconds":60,"leadInSeconds":0,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat","target":{"unit":"reps","value":10}},{"id":"b","name":"Row","target":{"unit":"metres","value":100}}]}});
        let r: WorkoutResult = serde_json::from_value(raw.clone()).unwrap();
        let s = store();
        s.mutate(Mutation::Save { result: r.clone() }).unwrap();
        assert_eq!(
            HistoryStore::new(s.path.clone()).read().unwrap().results[0],
            r
        );
        for score in [
            serde_json::json!({"completedMovements":3,"partialValue":100}),
            serde_json::json!({"completedMovements":1000000,"partialValue":0}),
            serde_json::Value::Null,
        ] {
            let mut invalid = raw.clone();
            invalid["amrapProgress"] = score;
            assert!(validate_result(&serde_json::from_value(invalid).unwrap()).is_err());
        }
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn for_time_results_roundtrip_with_exact_outcomes_and_preserve_invalid_data() {
        let raw = serde_json::json!({"id":"for-time","completedAt":1780000000000u64,"elapsedMs":1234,"outcome":"finished","checkedExerciseIds":["a"],"config":{"type":"forTime","timeCapSeconds":5,"leadInSeconds":2,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat"}]}});
        let result: WorkoutResult = serde_json::from_value(raw.clone()).unwrap();
        let s = store();
        s.mutate(Mutation::Save {
            result: result.clone(),
        })
        .unwrap();
        assert_eq!(s.read().unwrap().results, vec![result]);
        for (outcome, elapsed) in [
            ("finished", 5000),
            ("timeCapReached", 4999),
            ("unknown", 1234),
        ] {
            let mut invalid = raw.clone();
            invalid["outcome"] = outcome.into();
            invalid["elapsedMs"] = elapsed.into();
            assert!(s
                .mutate(Mutation::Save {
                    result: serde_json::from_value(invalid).unwrap()
                })
                .is_err());
            assert_eq!(s.read().unwrap().results.len(), 1);
        }
        let mut capped = raw.clone();
        capped["outcome"] = "timeCapReached".into();
        capped["elapsedMs"] = 5000.into();
        assert!(validate_result(&serde_json::from_value(capped).unwrap()).is_ok());
        let mut uncapped = raw;
        uncapped["config"]
            .as_object_mut()
            .unwrap()
            .remove("timeCapSeconds");
        uncapped["elapsedMs"] = 90000000.into();
        assert!(validate_result(&serde_json::from_value(uncapped).unwrap()).is_ok());
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    fn result() -> WorkoutResult {
        serde_json::from_value(serde_json::json!({"id":"session-1","completedAt":1780000000000u64,"elapsedMs":30000,"checkedExerciseIds":["entry"],"config":{"type":"countdown","durationSeconds":30,"leadInSeconds":5,"warningSeconds":3,"showChecklist":true,"exercises":[{"id":"entry","catalogId":"pushup","name":"Push-up","target":{"unit":"reps","value":10}}]}})).unwrap()
    }
    static TEST_ID: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    fn store() -> HistoryStore {
        HistoryStore::new(
            std::env::temp_dir()
                .join(format!(
                    "nextround-history-{}-{}-{}",
                    std::process::id(),
                    TEST_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_nanos()
                ))
                .join("history.json"),
        )
    }
    #[test]
    fn saves_once_and_preserves_identity_across_restart() {
        let s = store();
        let r = result();
        s.mutate(Mutation::Save { result: r.clone() }).unwrap();
        s.mutate(Mutation::Save { result: r.clone() }).unwrap();
        let read = HistoryStore::new(s.path.clone()).read().unwrap();
        assert_eq!(read.results, vec![r.clone()]);
        assert_eq!(
            serde_json::to_value(&read.results[0]).unwrap()["config"]["exercises"][0]["catalogId"],
            "pushup"
        );
        let mut changed = r;
        changed.config.exercises[0].name = "Changed".into();
        assert!(s.mutate(Mutation::Save { result: changed }).is_err());
        s.mutate(Mutation::Delete {
            id: "session-1".into(),
        })
        .unwrap();
        assert!(s.read().unwrap().results.is_empty());
        std::fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn rejects_extra_fields_and_normalizes_absent_catalog_identity() {
        let s = store();
        fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        let r = serde_json::to_value(result()).unwrap();
        for raw in [
            serde_json::json!({"version":1,"results":[r.clone()],"extra":"preserve me"}),
            {
                let mut extra = r.clone();
                extra["extra"] = "preserve me".into();
                serde_json::json!({"version":1,"results":[extra]})
            },
        ] {
            let bytes = serde_json::to_vec(&raw).unwrap();
            fs::write(&s.path, &bytes).unwrap();
            assert!(s
                .mutate(Mutation::Delete {
                    id: "session-1".into()
                })
                .is_err());
            assert_eq!(fs::read(&s.path).unwrap(), bytes);
        }
        let mut null_id = r;
        null_id["config"]["exercises"][0]["catalogId"] = serde_json::Value::Null;
        let parsed: WorkoutResult = serde_json::from_value(null_id).unwrap();
        assert!(parsed.config.exercises[0].catalog_id.is_none());
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn corrupt_future_and_invalid_records_are_not_replaced() {
        let s = store();
        std::fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        for raw in [
            "{broken",
            "{\"version\":2,\"results\":[]}",
            "{\"version\":1,\"results\":[{}]}",
        ] {
            std::fs::write(&s.path, raw).unwrap();
            assert!(s.mutate(Mutation::Save { result: result() }).is_err());
            assert_eq!(std::fs::read_to_string(&s.path).unwrap(), raw);
        }
        for value in [1, 31000] {
            let mut r = result();
            r.elapsed_ms = value;
            assert!(validate_result(&r).is_err());
        }
        let mut r = result();
        r.checked_exercise_ids.push("missing".into());
        assert!(validate_result(&r).is_err());
        std::fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
}
