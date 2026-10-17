use crate::{templates::atomic_write, timer};
use serde_json::{json, Value};
use std::{fs, path::PathBuf, sync::Mutex};

pub struct TrainingStore {
    pub(crate) path: PathBuf,
    pub(crate) gate: Mutex<()>,
}
impl TrainingStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            gate: Mutex::new(()),
        }
    }
    pub(crate) fn read_disk(&self) -> Result<Value, String> {
        match fs::read(&self.path) {
            Ok(bytes) => {
                if bytes.len() > 32 * 1024 * 1024 {
                    return Err("Training data exceeds 32 MiB.".into());
                }
                let value: Value = serde_json::from_slice(&bytes)
                    .map_err(|e| format!("Training data is unreadable; preserved: {e}"))?;
                validate(&value)?;
                Ok(value)
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                Ok(json!({"version":1,"sessions":[],"results":[],"actuals":{},"recovery":null}))
            }
            Err(e) => Err(e.to_string()),
        }
    }
    fn write(&self, expected: Value, next: Value) -> Result<Value, String> {
        let _guard = self.gate.lock().map_err(|_| "Training store unavailable")?;
        validate(&next)?;
        if self.read_disk()? != expected {
            return Err("Training data changed. Refresh and try again.".into());
        }
        let bytes = serde_json::to_vec(&next).map_err(|e| e.to_string())?;
        if bytes.len() > 32 * 1024 * 1024 {
            return Err("Training data exceeds 32 MiB.".into());
        }
        atomic_write(&self.path, &bytes)?;
        Ok(next)
    }
}
pub(crate) fn validate(value: &Value) -> Result<(), String> {
    let d = value.as_object().ok_or("Invalid training document")?;
    if d.get("version") != Some(&json!(1)) {
        return Err("Unsupported training data version; existing data preserved.".into());
    }
    if d.len() != 5
        || !d.contains_key("recovery")
        || !d.get("actuals").is_some_and(Value::is_object)
    {
        return Err("Invalid training document fields".into());
    }
    let sessions = d
        .get("sessions")
        .and_then(Value::as_array)
        .ok_or("Invalid sessions")?;
    let results = d
        .get("results")
        .and_then(Value::as_array)
        .ok_or("Invalid results")?;
    if sessions.len() > 100 || results.len() > 100000 {
        return Err("Training storage limit reached".into());
    }
    let mut ids = std::collections::HashSet::new();
    for session in sessions {
        validate_session(session)?;
        if !ids.insert(session["id"].as_str().ok_or("Missing session identity")?) {
            return Err("Duplicate session identity".into());
        }
    }
    ids.clear();
    for result in results {
        validate_result(result)?;
        if !ids.insert(result["id"].as_str().ok_or("Missing result identity")?) {
            return Err("Duplicate result identity".into());
        }
    }
    if !value["recovery"].is_null() {
        validate_recovery(&value["recovery"])?;
    }
    for (id, actuals) in d["actuals"].as_object().ok_or("Invalid actuals")? {
        bounded_text(&json!(id), 120)?;
        validate_actuals(actuals)?;
    }
    Ok(())
}
fn validate_session(value: &Value) -> Result<(), String> {
    fields(value, &["id", "name", "blocks", "favourite", "collections"])?;
    bounded_text(&value["name"], 120)?;
    bounded_text(&value["id"], 120)?;
    if value.get("favourite").is_some_and(|v| !v.is_boolean()) {
        return Err("Invalid session favourite".into());
    }
    if let Some(c) = value.get("collections") {
        let groups = c.as_array().ok_or("Invalid session collections")?;
        if groups.len() > 100 {
            return Err("Too many collections".into());
        }
        let mut seen = std::collections::HashSet::new();
        for id in groups {
            let id = bounded_text(id, 80)?;
            if !seen.insert(id) {
                return Err("Duplicate collection".into());
            }
        }
    }
    let name = value["name"].as_str().ok_or("Missing session name")?;
    let id = value["id"].as_str().ok_or("Missing session identity")?;
    let blocks = value["blocks"].as_array().ok_or("Missing workout blocks")?;
    if name.trim().is_empty()
        || name.len() > 480
        || id.is_empty()
        || id.len() > 480
        || blocks.is_empty()
        || blocks.len() > 20
    {
        return Err("Invalid session name or block count".into());
    }
    let mut ids = std::collections::HashSet::new();
    for block in blocks {
        fields(block, &["id", "name", "config", "restSeconds", "advance"])?;
        bounded_text(&block["name"], 120)?;
        bounded_text(&block["id"], 120)?;
        let id = block["id"].as_str().ok_or("Missing block identity")?;
        if !ids.insert(id) || id.is_empty() {
            return Err("Duplicate block identity".into());
        }
        if !matches!(block["advance"].as_str(), Some("automatic" | "ready"))
            || !block["restSeconds"].as_u64().is_some_and(|s| s <= 3600)
        {
            return Err("Invalid block transition".into());
        }
        let config: timer::Config =
            serde_json::from_value(block["config"].clone()).map_err(|e| e.to_string())?;
        timer::validate(&config)?;
    }
    Ok(())
}
#[tauri::command]
pub fn read_training(state: tauri::State<'_, TrainingStore>) -> Result<Value, String> {
    let _guard = state
        .gate
        .lock()
        .map_err(|_| "Training store unavailable")?;
    state.read_disk()
}
#[tauri::command]
pub fn write_training(
    state: tauri::State<'_, TrainingStore>,
    expected: Value,
    next: Value,
) -> Result<Value, String> {
    state.write(expected, next)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_conflict_and_future_document_preservation() {
        let dir = std::env::temp_dir().join(format!("nextround-training-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let store = TrainingStore::new(dir.join("training.json"));
        let empty = store.read_disk().unwrap();
        let mut changed = empty.clone();
        changed["actuals"]["one"] = json!([]);
        store.write(empty.clone(), changed.clone()).unwrap();
        assert!(store.write(empty, changed.clone()).is_err());
        assert_eq!(store.read_disk().unwrap(), changed);
        fs::write(&store.path, b"{\"version\":99}").unwrap();
        assert!(store.read_disk().is_err());
        assert_eq!(fs::read(&store.path).unwrap(), b"{\"version\":99}");
        fs::remove_dir_all(dir).unwrap();
    }
}

#[cfg(test)]
mod validation_tests {
    use super::*;
    #[test]
    fn rejects_invalid_actuals_and_duplicate_session_ids_before_writing() {
        let mut d = json!({"version":1,"sessions":[],"results":[],"actuals":{"r":[{"exerciseId":"e","occurrence":0,"reps":-1}]},"recovery":null});
        assert!(validate(&d).is_err());
        d["actuals"] = json!({"r":[{"exerciseId":"e","occurrence":0,"load":10}]});
        assert!(validate(&d).is_err());
        d["actuals"] = json!({});
        let s = json!({"id":"s","name":"Session","blocks":[{"id":"b","name":"Warm-up","config":{"type":"countdown","durationSeconds":10,"leadInSeconds":0,"warningSeconds":0},"restSeconds":0,"advance":"automatic"}]});
        d["sessions"] = json!([s, s]);
        assert!(validate(&d).is_err());
    }
}
fn fields<'a>(
    value: &'a Value,
    allowed: &[&str],
) -> Result<&'a serde_json::Map<String, Value>, String> {
    let object = value.as_object().ok_or("Expected a training object")?;
    if object.keys().any(|k| !allowed.contains(&k.as_str())) {
        return Err("Unsupported training fields".into());
    }
    Ok(object)
}
fn bounded_text(value: &Value, max: usize) -> Result<&str, String> {
    let s = value.as_str().ok_or("Expected training text")?;
    if s.trim().is_empty() || s.encode_utf16().count() > max {
        return Err("Invalid training text length".into());
    }
    Ok(s)
}
fn number(value: &Value, max: u64) -> Result<u64, String> {
    value
        .as_u64()
        .filter(|n| *n <= max)
        .ok_or("Invalid training number".into())
}
fn validate_actuals(value: &Value) -> Result<(), String> {
    let rows = value.as_array().ok_or("Invalid actual performance")?;
    if rows.len() > 10000 {
        return Err("Too many actual entries".into());
    }
    let mut ids = std::collections::HashSet::new();
    for a in rows {
        fields(
            a,
            &[
                "exerciseId",
                "occurrence",
                "reps",
                "seconds",
                "metres",
                "calories",
                "load",
                "loadUnit",
            ],
        )?;
        let id = bounded_text(&a["exerciseId"], 120)?;
        let occurrence = number(&a["occurrence"], 100000)?;
        if !ids.insert((id, occurrence)) {
            return Err("Duplicate actual entry".into());
        }
        for key in ["reps", "seconds", "metres", "calories", "load"] {
            if let Some(v) = a.get(key) {
                let n = v.as_f64().ok_or("Invalid actual value")?;
                if !n.is_finite()
                    || !(0.0..=10000000.0).contains(&n)
                    || (key == "reps" && n.fract() != 0.0)
                {
                    return Err("Invalid actual value".into());
                }
            }
        }
        if a.get("load").is_some() {
            if !matches!(a["loadUnit"].as_str(), Some("kg" | "lb")) {
                return Err("A load needs kg or lb".into());
            }
        } else if a.get("loadUnit").is_some() {
            return Err("Load unit without a load".into());
        }
    }
    Ok(())
}
fn validate_block_result(value: &Value, session: &Value) -> Result<(), String> {
    fields(
        value,
        &[
            "blockId",
            "status",
            "elapsedMs",
            "actuals",
            "checkedIds",
            "completedMovements",
            "partialValue",
        ],
    )?;
    let id = bounded_text(&value["blockId"], 120)?;
    let block = session["blocks"]
        .as_array()
        .and_then(|blocks| blocks.iter().find(|b| b["id"] == id))
        .ok_or("Missing result block")?;
    if !matches!(
        value["status"].as_str(),
        Some("complete" | "partial" | "skipped")
    ) {
        return Err("Invalid block result status".into());
    }
    number(&value["elapsedMs"], 604800000)?;
    number(&value["completedMovements"], 1000000)?;
    number(&value["partialValue"], 10000000)?;
    validate_actuals(&value["actuals"])?;
    let config: timer::Config =
        serde_json::from_value(block["config"].clone()).map_err(|e| e.to_string())?;
    for a in value["actuals"].as_array().ok_or("Missing actuals")? {
        if !config.exercises.iter().any(|e| e.id == a["exerciseId"]) {
            return Err("Actual refers to missing exercise".into());
        }
    }
    let checked = value["checkedIds"]
        .as_array()
        .ok_or("Invalid checked exercise list")?;
    let mut seen = std::collections::HashSet::new();
    for id in checked {
        let id = bounded_text(id, 120)?;
        if !seen.insert(id) || !config.exercises.iter().any(|e| e.id == id) {
            return Err("Invalid checked exercise".into());
        }
    }
    Ok(())
}
fn validate_result(value: &Value) -> Result<(), String> {
    fields(value, &["id", "session", "completedAt", "blocks", "note"])?;
    bounded_text(&value["id"], 120)?;
    validate_session(&value["session"])?;
    number(&value["completedAt"], 8640000000000000)?;
    if !value["note"]
        .as_str()
        .is_some_and(|s| s.encode_utf16().count() <= 2000)
    {
        return Err("Invalid session note".into());
    }
    let blocks = value["blocks"].as_array().ok_or("Invalid block results")?;
    if blocks.len()
        != value["session"]["blocks"]
            .as_array()
            .ok_or("Invalid session")?
            .len()
    {
        return Err("Missing block results".into());
    }
    let mut ids = std::collections::HashSet::new();
    for b in blocks {
        validate_block_result(b, &value["session"])?;
        if !ids.insert(b["blockId"].as_str().ok_or("Missing block identity")?) {
            return Err("Duplicate block result".into());
        }
    }
    Ok(())
}
fn validate_recovery(value: &Value) -> Result<(), String> {
    fields(
        value,
        &[
            "id",
            "session",
            "index",
            "stage",
            "restRemainingMs",
            "snapshot",
            "blocks",
            "current",
            "updatedAt",
        ],
    )?;
    bounded_text(&value["id"], 120)?;
    validate_session(&value["session"])?;
    let blocks = value["session"]["blocks"]
        .as_array()
        .ok_or("Invalid recovery blocks")?;
    let index = number(&value["index"], blocks.len() as u64 - 1)? as usize;
    if !matches!(
        value["stage"].as_str(),
        Some("work" | "rest" | "ready" | "review")
    ) {
        return Err("Invalid recovery stage".into());
    }
    number(&value["restRemainingMs"], 3600000)?;
    number(&value["updatedAt"], 8640000000000000)?;
    validate_block_result(&value["current"], &value["session"])?;
    if value["current"]["blockId"] != blocks[index]["id"] {
        return Err("Recovery block position mismatch".into());
    }
    let completed = value["blocks"]
        .as_array()
        .ok_or("Invalid recovery results")?;
    if completed.len() > 20 {
        return Err("Too many recovery results".into());
    }
    let mut ids = std::collections::HashSet::new();
    for b in completed {
        validate_block_result(b, &value["session"])?;
        if !ids.insert(b["blockId"].as_str().ok_or("Missing block identity")?) {
            return Err("Duplicate recovery result".into());
        }
    }
    let s = &value["snapshot"];
    if !s.is_null() {
        fields(
            s,
            &[
                "config",
                "phase",
                "remainingMs",
                "roundRemainingMs",
                "roundIndex",
                "exerciseIndex",
                "elapsedMs",
                "paused",
                "notice",
                "intervalPhase",
                "ladderCompletedMovements",
                "outcome",
            ],
        )?;
        let config: timer::Config =
            serde_json::from_value(s["config"].clone()).map_err(|e| e.to_string())?;
        let expected: timer::Config =
            serde_json::from_value(blocks[index]["config"].clone()).map_err(|e| e.to_string())?;
        if config != expected {
            return Err("Recovery prescription mismatch".into());
        }
        for key in [
            "elapsedMs",
            "remainingMs",
            "roundRemainingMs",
            "roundIndex",
            "exerciseIndex",
        ] {
            number(&s[key], 604800000)?;
        }
        if !s["paused"].is_boolean()
            || !matches!(
                s["phase"].as_str(),
                Some("leadIn" | "running" | "completed" | "cancelled")
            )
        {
            return Err("Invalid recovery clock".into());
        }
    }
    Ok(())
}
