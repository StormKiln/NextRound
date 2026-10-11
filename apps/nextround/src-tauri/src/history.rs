use crate::{
    templates::atomic_write,
    timer::{self, Config, Mode},
};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkoutResult {
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub note: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ladder_completed_movements: Option<u32>,
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
    Save {
        result: Box<WorkoutResult>,
    },
    Delete {
        id: String,
    },
    Note {
        id: String,
        #[serde(rename = "expectedNote")]
        expected_note: String,
        note: String,
    },
}
pub struct HistoryStore {
    path: PathBuf,
    gate: Mutex<()>,
}
// Keep this explicit set in sync with history/note-text.ts (ECMAScript whitespace).
fn blank_note(note: &str) -> bool {
    note.chars().all(|c| {
        matches!(c,
        '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' |
        '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' |
        '\u{205f}' | '\u{3000}' | '\u{feff}')
    })
}
fn validate_result(result: &WorkoutResult) -> Result<(), String> {
    timer::validate(&result.config)?;
    if result.note.chars().count() > 2000 {
        return Err("Notes can contain up to 2,000 characters.".into());
    }
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
    if result.config.mode == Mode::Ladder {
        let done = result
            .ladder_completed_movements
            .ok_or("Ladder progress required.")?;
        if done > result.config.ladder_total()
            || (result.outcome.as_deref() == Some("finished")
                && done != result.config.ladder_total())
        {
            return Err("Invalid Ladder progress.".into());
        }
    } else if result.ladder_completed_movements.is_some() {
        return Err("Progress applies only to Ladder.".into());
    }
    let mut checked = HashSet::new();
    if result.id.trim().is_empty()
        || result.id.chars().count() > 120
        || result.completed_at == 0
        || result.completed_at > 8_640_000_000_000_000
        || if matches!(result.config.mode, Mode::ForTime | Mode::Ladder) {
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
        let mut document: HistoryDocument = serde_json::from_slice(&raw).map_err(|e| {
            format!("Workout history is unreadable; existing data is preserved: {e}")
        })?;
        if document.version != 1 {
            return Err(
                "This workout history version is unsupported. Existing data is preserved.".into(),
            );
        }
        let mut ids = HashSet::new();
        for result in &mut document.results {
            validate_result(result)?;
            if blank_note(&result.note) {
                result.note.clear();
            }
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
                    let mut performed = existing.clone();
                    performed.note = result.note.clone();
                    if &performed != result.as_ref() {
                        return Err("This session is already saved with different data.".into());
                    }
                    return Ok(document);
                }
                document.results.push(*result);
            }
            Mutation::Note {
                id,
                expected_note,
                note,
            } => {
                if note.chars().count() > 2000 {
                    return Err("Notes can contain up to 2,000 characters.".into());
                }
                let result = document
                    .results
                    .iter_mut()
                    .find(|r| r.id == id)
                    .ok_or("This result no longer exists. Refresh and try again.")?;
                if result.note != expected_note {
                    return Err("This note changed elsewhere. Refresh history to review the latest note before saving.".into());
                }
                result.note = if blank_note(&note) {
                    String::new()
                } else {
                    note
                };
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
    fn unicode_blank_notes_remain_editable() {
        let s = store();
        let original = result();
        s.mutate(Mutation::Save {
            result: Box::new(original.clone()),
        })
        .unwrap();
        let edit = |expected: &str, note: &str| Mutation::Note {
            id: original.id.clone(),
            expected_note: expected.into(),
            note: note.into(),
        };
        s.mutate(edit("", "\u{feff}")).unwrap();
        assert!(s.read().unwrap().results[0].note.is_empty());
        s.mutate(edit("", "After blank")).unwrap();
        s.mutate(edit("After blank", "\u{85}")).unwrap();
        assert_eq!(s.read().unwrap().results[0].note, "\u{85}");
        s.mutate(edit("\u{85}", "Next")).unwrap();
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn notes_preserve_results_and_detect_conflicts() {
        let s = store();
        let original = result();
        s.mutate(Mutation::Save {
            result: Box::new(original.clone()),
        })
        .unwrap();
        let command = |expected: &str, note: &str| {
            serde_json::from_value::<Mutation>(
                serde_json::json!({"action":"note","id":original.id,"expectedNote":expected,"note":note}),
            )
        };
        assert!(
            command("", "First").is_ok(),
            "note mutation must be supported"
        );
        s.mutate(command("", "First").unwrap()).unwrap();
        s.mutate(Mutation::Save {
            result: Box::new(original.clone()),
        })
        .unwrap();
        assert_eq!(
            serde_json::to_value(s.read().unwrap()).unwrap()["results"][0]["note"],
            "First"
        );
        let bytes = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(command("", "Stale").unwrap())
            .unwrap_err()
            .contains("note changed"));
        assert_eq!(fs::read(&s.path).unwrap(), bytes);
        let unicode = "😀".repeat(2000);
        s.mutate(command("First", &unicode).unwrap()).unwrap();
        assert!(s
            .mutate(command(&unicode, &(unicode.clone() + "x")).unwrap())
            .is_err());
        s.mutate(command(&unicode, " \n ").unwrap()).unwrap();
        assert_eq!(s.read().unwrap().results, vec![original.clone()]);
        s.mutate(Mutation::Delete {
            id: original.id.clone(),
        })
        .unwrap();
        assert!(s.mutate(command("", "Missing").unwrap()).is_err());
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn amrap_score_roundtrips_and_rejects_invalid_partial_units() {
        let raw = serde_json::json!({"id":"amrap", "completedAt":1780000000000u64,"elapsedMs":60000,"checkedExerciseIds":[], "amrapProgress":{"completedMovements":3,"partialValue":40},"config":{"type":"amrap","durationSeconds":60,"leadInSeconds":0,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat","target":{"unit":"reps","value":10}},{"id":"b","name":"Row","target":{"unit":"metres","value":100}}]}});
        let r: WorkoutResult = serde_json::from_value(raw.clone()).unwrap();
        let s = store();
        s.mutate(Mutation::Save {
            result: Box::new(r.clone()),
        })
        .unwrap();
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
    fn ladder_result_requires_valid_progress() {
        let raw = serde_json::json!({"id":"ladder","completedAt":1780000000000u64,"elapsedMs":1234,"outcome":"finished","ladderCompletedMovements":2,"checkedExerciseIds":[],"config":{"type":"ladder","ladder":{"direction":"ascending","startReps":2,"increment":2,"rungs":2},"leadInSeconds":0,"warningSeconds":0,"exercises":[{"id":"a","name":"Squat"}]}});
        let result: WorkoutResult = serde_json::from_value(raw.clone()).unwrap();
        assert!(validate_result(&result).is_ok());
        for done in [0, 1, 3] {
            let mut bad = result.clone();
            bad.ladder_completed_movements = Some(done);
            assert!(validate_result(&bad).is_err());
        }
        let mut capped = result;
        capped.config.time_cap_seconds = Some(5);
        capped.outcome = Some("timeCapReached".into());
        capped.elapsed_ms = 5000;
        capped.ladder_completed_movements = Some(1);
        assert!(validate_result(&capped).is_ok());
    }
    #[test]
    fn for_time_results_roundtrip_with_exact_outcomes_and_preserve_invalid_data() {
        let raw = serde_json::json!({"id":"for-time","completedAt":1780000000000u64,"elapsedMs":1234,"outcome":"finished","checkedExerciseIds":["a"],"config":{"type":"forTime","timeCapSeconds":5,"leadInSeconds":2,"warningSeconds":3,"exercises":[{"id":"a","name":"Squat"}]}});
        let result: WorkoutResult = serde_json::from_value(raw.clone()).unwrap();
        let s = store();
        s.mutate(Mutation::Save {
            result: Box::new(result.clone()),
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
        s.mutate(Mutation::Save {
            result: Box::new(r.clone()),
        })
        .unwrap();
        s.mutate(Mutation::Save {
            result: Box::new(r.clone()),
        })
        .unwrap();
        let read = HistoryStore::new(s.path.clone()).read().unwrap();
        assert_eq!(read.results, vec![r.clone()]);
        assert_eq!(
            serde_json::to_value(&read.results[0]).unwrap()["config"]["exercises"][0]["catalogId"],
            "pushup"
        );
        let mut changed = r;
        changed.config.exercises[0].name = "Changed".into();
        assert!(s
            .mutate(Mutation::Save {
                result: Box::new(changed)
            })
            .is_err());
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
            assert!(s
                .mutate(Mutation::Save {
                    result: Box::new(result())
                })
                .is_err());
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
