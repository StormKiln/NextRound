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
use unicode_normalization::UnicodeNormalization;

static NEXT_ID: AtomicU64 = AtomicU64::new(0);
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkoutTemplate {
    pub id: String,
    pub name: String,
    pub config: Config,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub favourite: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkoutCollection {
    pub id: String,
    pub name: String,
    #[serde(rename = "workoutIds")]
    pub workout_ids: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TemplateDocument {
    pub version: u32,
    pub templates: Vec<WorkoutTemplate>,
    #[serde(default)]
    pub collections: Vec<WorkoutCollection>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CollectionWorkout {
    name: String,
    config: Config,
}
#[derive(Deserialize)]
#[serde(tag = "action", rename_all = "lowercase", deny_unknown_fields)]
pub enum Mutation {
    Collectionimport {
        name: String,
        workouts: Vec<CollectionWorkout>,
    },
    Collectioncreate {
        name: String,
    },
    Collectionrename {
        id: String,
        name: String,
        #[serde(rename = "expectedName")]
        expected_name: String,
    },
    Collectiondelete {
        id: String,
        #[serde(rename = "expectedName")]
        expected_name: String,
    },
    Membership {
        id: String,
        #[serde(rename = "collectionIds")]
        collection_ids: Vec<String>,
        #[serde(rename = "expectedCollectionIds")]
        expected_collection_ids: Vec<String>,
    },
    Save {
        name: String,
        config: Config,
    },
    Import {
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
        #[serde(rename = "expectedName")]
        expected_name: String,
    },
    Favourite {
        id: String,
        favourite: bool,
    },
    Duplicate {
        id: String,
        expected: WorkoutTemplate,
        name: String,
    },
    Delete {
        id: String,
        expected: WorkoutTemplate,
    },
}
pub struct TemplateStore {
    path: PathBuf,
    pub(crate) gate: Mutex<()>,
}
fn name_value(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err("Enter a workout name from 1 to 120 characters.".into());
    }
    Ok(name.into())
}
// Match ECMAScript String.trim and /\s/, including FEFF but excluding NEL (0085).
fn js_whitespace(c: char) -> bool {
    matches!(c, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}
fn normalized_name(name: &str) -> String {
    name.nfkc()
        .collect::<String>()
        .split(js_whitespace)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}
fn collection_name(name: &str) -> Result<String, String> {
    let name = name.trim_matches(js_whitespace);
    if name.is_empty() || name.encode_utf16().count() > 80 {
        return Err("NR_COLLECTION_NAME:Enter a collection name from 1 to 80 characters.".into());
    }
    Ok(name.into())
}
fn require_current(current: &WorkoutTemplate, expected: &WorkoutTemplate) -> Result<(), String> {
    if current.id != expected.id
        || current.name != expected.name
        || current.config != expected.config
    {
        return Err(
            "This saved workout changed. Refresh to review it before confirming again.".into(),
        );
    }
    Ok(())
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
                    version: 2,
                    templates: vec![],
                    collections: vec![],
                })
            }
            Err(error) => return Err(format!("Cannot read saved workouts: {error}")),
        };
        let wire: serde_json::Value = serde_json::from_slice(&raw)
            .map_err(|_| "Saved workouts are unreadable; existing data is preserved.")?;
        if (wire["version"] == 1 && wire.get("collections").is_some())
            || (wire["version"] == 2 && !wire["collections"].is_array())
        {
            return Err("Invalid collection schema; existing data is preserved.".into());
        }
        let mut document: TemplateDocument = serde_json::from_slice(&raw).map_err(|error| {
            format!("Saved workouts are unreadable; existing data is preserved: {error}")
        })?;
        if document.version != 1 && document.version != 2 {
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
        if document.collections.len() > 100
            || (document.version == 1 && !document.collections.is_empty())
        {
            return Err("Invalid saved collections.".into());
        }
        let mut collection_ids = HashSet::new();
        let mut names = HashSet::new();
        for c in &document.collections {
            collection_name(&c.name)?;
            if c.id.is_empty()
                || c.id.len() > 120
                || !collection_ids.insert(&c.id)
                || !names.insert(normalized_name(&c.name))
            {
                return Err("Invalid saved collections.".into());
            }
            let mut members = HashSet::new();
            if c.workout_ids
                .iter()
                .any(|id| !ids.contains(id) || !members.insert(id))
            {
                return Err("Invalid collection membership.".into());
            }
        }
        document.version = 2;
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
            Mutation::Collectionimport { name, workouts } => {
                let name = collection_name(&name)?;
                if document
                    .collections
                    .iter()
                    .any(|c| normalized_name(&c.name) == normalized_name(&name))
                {
                    return Err(
                        "NR_COLLECTION_NAME:A collection with this name already exists.".into(),
                    );
                }
                if workouts.is_empty() || workouts.len() > 100 {
                    return Err("Import 1–100 workouts.".into());
                }
                if document.collections.len() >= 100
                    || document.templates.len() + workouts.len() > 100
                {
                    return Err("The library limit is 100 workouts and 100 collections. Free space before importing.".into());
                }
                let mut used: HashSet<_> = document
                    .templates
                    .iter()
                    .map(|t| normalized_name(&t.name))
                    .collect();
                let mut ids = vec![];
                for workout in workouts {
                    let name = workout.name.trim_matches(js_whitespace);
                    if name.is_empty() || name.encode_utf16().count() > 120 {
                        return Err("Enter a workout name from 1 to 120 characters.".into());
                    }
                    if !used.insert(normalized_name(name)) {
                        return Err(format!(
                            "A workout named “{name}” already exists. Choose another name."
                        ));
                    }
                    let mut config = workout.config;
                    timer::validate(&config)?;
                    for exercise in &mut config.exercises {
                        exercise.id = unique_id();
                    }
                    let id = unique_id();
                    ids.push(id.clone());
                    document.templates.push(WorkoutTemplate {
                        id,
                        name: name.into(),
                        config,
                        favourite: false,
                    });
                }
                document.collections.push(WorkoutCollection {
                    id: unique_id(),
                    name,
                    workout_ids: ids,
                });
            }
            Mutation::Collectioncreate { name } => {
                let name = collection_name(&name)?;
                if document.collections.len() >= 100 {
                    return Err("NR_COLLECTION_CAPACITY:You can save up to 100 collections.".into());
                }
                if document
                    .collections
                    .iter()
                    .any(|c| normalized_name(&c.name) == normalized_name(&name))
                {
                    return Err(
                        "NR_COLLECTION_NAME:A collection with this name already exists.".into(),
                    );
                }
                document.collections.push(WorkoutCollection {
                    id: unique_id(),
                    name,
                    workout_ids: vec![],
                });
            }
            Mutation::Collectionrename {
                id,
                name,
                expected_name,
            } => {
                let name = collection_name(&name)?;
                if document
                    .collections
                    .iter()
                    .any(|c| c.id != id && normalized_name(&c.name) == normalized_name(&name))
                {
                    return Err(
                        "NR_COLLECTION_NAME:A collection with this name already exists.".into(),
                    );
                }
                let c = document
                    .collections
                    .iter_mut()
                    .find(|c| c.id == id)
                    .ok_or("NR_COLLECTION_CONFLICT:This collection no longer exists.")?;
                if c.name != expected_name {
                    return Err(
                        "NR_COLLECTION_CONFLICT:This collection changed. Refresh and try again."
                            .into(),
                    );
                }
                c.name = name;
            }
            Mutation::Collectiondelete { id, expected_name } => {
                let c = document
                    .collections
                    .iter()
                    .find(|c| c.id == id)
                    .ok_or("NR_COLLECTION_CONFLICT:This collection no longer exists.")?;
                if c.name != expected_name {
                    return Err(
                        "NR_COLLECTION_CONFLICT:This collection changed. Refresh and try again."
                            .into(),
                    );
                }
                document.collections.retain(|c| c.id != id);
            }
            Mutation::Membership {
                id,
                collection_ids,
                mut expected_collection_ids,
            } => {
                if !document.templates.iter().any(|t| t.id == id) {
                    return Err("This saved workout no longer exists.".into());
                }
                let mut current: Vec<_> = document
                    .collections
                    .iter()
                    .filter(|c| c.workout_ids.contains(&id))
                    .map(|c| c.id.clone())
                    .collect();
                current.sort();
                expected_collection_ids.sort();
                if current != expected_collection_ids {
                    return Err("NR_COLLECTION_CONFLICT:Workout collections changed. Refresh and try again.".into());
                }
                let mut seen = HashSet::new();
                if collection_ids.iter().any(|cid| {
                    !seen.insert(cid) || !document.collections.iter().any(|c| c.id == *cid)
                }) {
                    return Err(
                        "NR_COLLECTION_CONFLICT:A selected collection no longer exists. Refresh and try again.".into(),
                    );
                }
                for c in &mut document.collections {
                    c.workout_ids.retain(|wid| wid != &id);
                    if collection_ids.contains(&c.id) {
                        c.workout_ids.push(id.clone());
                    }
                }
            }
            Mutation::Save { name, config } => {
                if document.templates.len() >= 100 {
                    return Err(
                        "You can save up to 100 workouts. Delete one before saving another.".into(),
                    );
                }
                timer::validate(&config)?;
                document.templates.push(WorkoutTemplate {
                    id: unique_id(),
                    favourite: false,
                    name: name_value(&name)?,
                    config,
                });
            }
            Mutation::Import { name, config } => {
                let name = name_value(&name)?;
                if document
                    .templates
                    .iter()
                    .any(|e| e.name.trim().to_lowercase() == name.to_lowercase())
                {
                    return Err(format!(
                        "A workout named “{name}” already exists. Choose another name."
                    ));
                }
                if document.templates.len() >= 100 {
                    return Err(
                        "You can save up to 100 workouts. Delete one before importing another."
                            .into(),
                    );
                }
                timer::validate(&config)?;
                document.templates.push(WorkoutTemplate {
                    id: unique_id(),
                    favourite: false,
                    name,
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
                if entry.id != expected.id
                    || entry.name != expected.name
                    || entry.config != expected.config
                {
                    return Err(
                        "This saved workout changed since you loaded it. Reload it or save as new."
                            .into(),
                    );
                }
                timer::validate(&config)?;
                *entry = WorkoutTemplate {
                    favourite: entry.favourite,
                    id,
                    name: name_value(&name)?,
                    config,
                };
            }
            Mutation::Favourite { id, favourite } => {
                let entry = document
                    .templates
                    .iter_mut()
                    .find(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                entry.favourite = favourite;
            }
            Mutation::Rename {
                id,
                name,
                expected_name,
            } => {
                let entry = document
                    .templates
                    .iter_mut()
                    .find(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                if entry.name != expected_name {
                    return Err("This saved workout name changed. Refresh to review the current name before trying again.".into());
                }
                entry.name = name_value(&name)?;
            }
            Mutation::Duplicate { id, expected, name } => {
                let entry = document
                    .templates
                    .iter()
                    .find(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                require_current(entry, &expected)?;
                if document.templates.len() >= 100 {
                    return Err(
                        "You can save up to 100 workouts. Delete one before saving another.".into(),
                    );
                }
                let copy = WorkoutTemplate {
                    id: unique_id(),
                    name: name_value(&name)?,
                    config: entry.config.clone(),
                    favourite: false,
                };
                for c in &mut document.collections {
                    if c.workout_ids.contains(&id) {
                        c.workout_ids.push(copy.id.clone());
                    }
                }
                document.templates.push(copy);
            }
            Mutation::Delete { id, expected } => {
                let index = document
                    .templates
                    .iter()
                    .position(|e| e.id == id)
                    .ok_or("This saved workout no longer exists.")?;
                require_current(&document.templates[index], &expected)?;
                document.templates.remove(index);
                for c in &mut document.collections {
                    c.workout_ids.retain(|wid| wid != &id);
                }
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
    atomic_write_with(path, bytes, |file, bytes| {
        file.write_all(bytes)?;
        file.sync_all()
    })
}
fn atomic_write_with(
    path: &Path,
    bytes: &[u8],
    write_and_sync: impl FnOnce(&mut fs::File, &[u8]) -> std::io::Result<()>,
) -> Result<(), String> {
    let parent = path.parent().ok_or("Saved workout directory unavailable")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(".workout-templates-{}.tmp", unique_id()));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| e.to_string())?;
    let result = (|| {
        write_and_sync(&mut file, bytes)?;
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
    #[test]
    fn collection_import_is_atomic_and_independent() {
        let s = store();
        let command = |name: &str, workouts: serde_json::Value| {
            serde_json::from_value::<Mutation>(
                serde_json::json!({"action":"collectionimport","name":name,"workouts":workouts}),
            )
            .unwrap()
        };
        let workouts = serde_json::json!([{"name":"Morning","config":config()},{"name":"Evening","config":config()}]);
        let d = s.mutate(command("Training", workouts.clone())).unwrap();
        assert_eq!(d.templates.len(), 2);
        assert_eq!(
            d.collections[0].workout_ids,
            d.templates.iter().map(|t| t.id.clone()).collect::<Vec<_>>()
        );
        assert!(d.templates.iter().all(|t| !t.favourite));
        let before = fs::read(&s.path).unwrap();
        assert!(s.mutate(command("Other", workouts)).is_err());
        assert_eq!(fs::read(&s.path).unwrap(), before);
        assert!(s.mutate(command("Other", serde_json::json!([{"name":"Unique","config":config()},{"name":"Morning","config":config()}]))).is_err());
        assert_eq!(fs::read(&s.path).unwrap(), before);
    }
    #[test]
    fn collection_import_checks_latest_capacity_and_preserves_bytes_on_failure() {
        let s = store();
        let command = || {
            serde_json::from_value::<Mutation>(serde_json::json!({"action":"collectionimport","name":"Incoming","workouts":[{"name":"New","config":config()}]})).unwrap()
        };
        for i in 0..100 {
            s.mutate(Mutation::Collectioncreate {
                name: format!("Collection {i}"),
            })
            .unwrap();
        }
        let before = fs::read(&s.path).unwrap();
        assert!(s.mutate(command()).unwrap_err().contains("100"));
        assert_eq!(fs::read(&s.path).unwrap(), before);
        let s = store();
        s.mutate(Mutation::Collectioncreate {
            name: "Existing".into(),
        })
        .unwrap();
        let before = fs::read(&s.path).unwrap();
        use std::os::unix::fs::PermissionsExt;
        let parent = s.path.parent().unwrap();
        let permissions = fs::metadata(parent).unwrap().permissions();
        fs::set_permissions(parent, fs::Permissions::from_mode(0o555)).unwrap();
        let result = s.mutate(command());
        fs::set_permissions(parent, permissions).unwrap();
        assert!(result.is_err());
        assert_eq!(fs::read(&s.path).unwrap(), before);
    }
    #[test]
    fn collection_names_use_ecmascript_whitespace() {
        assert_eq!(
            collection_name("\u{feff}Strength\u{feff}").unwrap(),
            "Strength"
        );
        assert_eq!(
            collection_name("\u{0085}Strength").unwrap(),
            "\u{0085}Strength"
        );
        assert_eq!(normalized_name("A\u{feff} B"), "a b");
        assert_ne!(normalized_name("A\u{0085}B"), normalized_name("A B"));
    }
    #[test]
    fn collections_migrate_and_preserve_workouts() {
        let s = store();
        fs::create_dir_all(s.path.parent().unwrap()).unwrap();
        let legacy = serde_json::json!({"version":1,"templates":[{"id":"w","name":"Morning","config":config()}]});
        fs::write(&s.path, legacy.to_string()).unwrap();
        let read = serde_json::to_value(s.read().unwrap()).unwrap();
        assert_eq!(read["version"], 2);
        assert_eq!(read["collections"], serde_json::json!([]));
        let command = |value| serde_json::from_value::<Mutation>(value).unwrap();
        let d = s
            .mutate(command(
                serde_json::json!({"action":"collectioncreate","name":"Ｋｅｔｔｌｅ  Bell"}),
            ))
            .unwrap();
        let d = serde_json::to_value(d).unwrap();
        let id = d["collections"][0]["id"].as_str().unwrap();
        assert!(s
            .mutate(command(
                serde_json::json!({"action":"collectioncreate","name":"kettle bell"})
            ))
            .is_err());
        s.mutate(command(serde_json::json!({"action":"membership","id":"w","collectionIds":[id],"expectedCollectionIds":[]}))).unwrap();
        let bytes = fs::read(&s.path).unwrap();
        assert!(s.mutate(command(serde_json::json!({"action":"membership","id":"w","collectionIds":[],"expectedCollectionIds":[]}))).is_err());
        assert_eq!(bytes, fs::read(&s.path).unwrap());
        let d=s.mutate(command(serde_json::json!({"action":"collectiondelete","id":id,"expectedName":"Ｋｅｔｔｌｅ  Bell"}))).unwrap();
        assert_eq!(d.templates.len(), 1);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn import_rejects_duplicate_names_and_preserves_existing_records() {
        let s = store();
        s.mutate(Mutation::Save {
            name: "Original".into(),
            config: config(),
        })
        .unwrap();
        let before = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(Mutation::Import {
                name: " ORIGINAL ".into(),
                config: config()
            })
            .unwrap_err()
            .contains("name"));
        assert_eq!(before, fs::read(&s.path).unwrap());
        let imported = s
            .mutate(Mutation::Import {
                name: "New".into(),
                config: config(),
            })
            .unwrap();
        assert_eq!(imported.templates.len(), 2);
        assert!(!imported.templates[1].favourite);
        assert_ne!(imported.templates[0].id, imported.templates[1].id);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
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
    fn duplicate_preserves_every_mode_and_capacity_is_non_destructive() {
        let cases = serde_json::json!([
            {"minutes":3},
            {"type":"countdown","durationSeconds":90,"showChecklist":false},
            {"type":"intervals","workSeconds":30,"restSeconds":10,"rounds":3},
            {"type":"amrap","durationSeconds":90},
            {"type":"forTime","timeCapSeconds":90,"showChecklist":false},
            {"type":"ladder","timeCapSeconds":90,"ladder":{"direction":"pyramid","startReps":2,"increment":2,"rungs":3}}
        ]);
        let s = store();
        for mut value in cases.as_array().unwrap().clone() {
            value["leadInSeconds"] = serde_json::json!(5);
            value["warningSeconds"] = serde_json::json!(3);
            value["exercises"] = if value["type"] == "ladder" {
                serde_json::json!([{"id":"a","name":"Squat"}])
            } else {
                serde_json::json!([{"id":"a","name":"Squat","description":"Saved description","target":{"unit":"reps","value":5}}])
            };
            let config: Config = serde_json::from_value(value).unwrap();
            let document = s
                .mutate(Mutation::Save {
                    name: "Original".into(),
                    config: config.clone(),
                })
                .unwrap();
            let original = document.templates.last().unwrap().clone();
            let document = s
                .mutate(Mutation::Duplicate {
                    id: original.id.clone(),
                    expected: original.clone(),
                    name: "Copy".into(),
                })
                .unwrap();
            let copy = document.templates.last().unwrap();
            assert_eq!(copy.config, config);
            assert_ne!(copy.id, original.id);
            assert!(!copy.favourite);
        }
        while s.read().unwrap().templates.len() < 100 {
            s.mutate(Mutation::Save {
                name: "Fill".into(),
                config: config(),
            })
            .unwrap();
        }
        let original = s.read().unwrap().templates[0].clone();
        let before = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(Mutation::Duplicate {
                id: original.id.clone(),
                expected: original,
                name: "Overflow".into()
            })
            .unwrap_err()
            .contains("100"));
        assert_eq!(fs::read(&s.path).unwrap(), before);
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
    }
    #[test]
    fn duplicate_and_delete_require_current_content() {
        let s = store();
        let original = s
            .mutate(Mutation::Save {
                name: "Original".into(),
                config: config(),
            })
            .unwrap()
            .templates[0]
            .clone();
        s.mutate(Mutation::Favourite {
            id: original.id.clone(),
            favourite: true,
        })
        .unwrap();
        let command = |action: &str| {
            serde_json::from_value::<Mutation>(
                serde_json::json!({"action":action,"id":original.id,"expected":original,"name":"Copy"}),
            )
        };
        let copied = s.mutate(command("duplicate").unwrap()).unwrap();
        assert_eq!(copied.templates.len(), 2);
        assert_ne!(copied.templates[1].id, original.id);
        assert_eq!(copied.templates[1].config, original.config);
        assert!(!copied.templates[1].favourite);
        s.mutate(Mutation::Rename {
            id: original.id.clone(),
            expected_name: original.name.clone(),
            name: "Changed".into(),
        })
        .unwrap();
        let before = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(command("duplicate").unwrap())
            .unwrap_err()
            .contains("changed"));
        let delete = serde_json::from_value(
            serde_json::json!({"action":"delete","id":original.id,"expected":original}),
        )
        .unwrap();
        assert!(s.mutate(delete).unwrap_err().contains("changed"));
        assert_eq!(fs::read(&s.path).unwrap(), before);
    }
    #[test]
    fn favourites_preserve_content_updates_and_rename_guards() {
        let s = store();
        let original = s
            .mutate(Mutation::Save {
                name: "Routine".into(),
                config: config(),
            })
            .unwrap()
            .templates[0]
            .clone();
        let favourite: Result<Mutation, _> = serde_json::from_value(
            serde_json::json!({"action":"favourite","id":original.id,"favourite":true}),
        );
        assert!(favourite.is_ok(), "favourite command must be supported");
        s.mutate(favourite.unwrap()).unwrap();
        s.mutate(Mutation::Update {
            id: original.id.clone(),
            expected: original.clone(),
            name: "Routine".into(),
            config: config(),
        })
        .unwrap();
        let persisted =
            serde_json::to_value(TemplateStore::new(s.path.clone()).read().unwrap()).unwrap();
        assert_eq!(persisted["templates"][0]["favourite"], true);
        let rename = |expected: &str, name: &str| {
            serde_json::from_value(serde_json::json!({"action":"rename","id":original.id,"expectedName":expected,"name":name})).unwrap()
        };
        s.mutate(rename("Routine", "Newer")).unwrap();
        let raw = fs::read(&s.path).unwrap();
        assert!(s
            .mutate(rename("Routine", "Stale"))
            .unwrap_err()
            .contains("name changed"));
        assert_eq!(fs::read(&s.path).unwrap(), raw);
        s.mutate(rename("Newer", " Latest ")).unwrap();
        assert_eq!(s.read().unwrap().templates[0].name, "Latest");
        fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
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
        s.mutate(Mutation::Delete {
            id: original.id,
            expected: s.read().unwrap().templates[0].clone(),
        })
        .unwrap();
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
            expected_name: "Strength".into(),
        })
        .unwrap();
        assert_eq!(s.read().unwrap().templates[0].name, "Renamed");
        s.mutate(Mutation::Delete {
            id: saved.templates[0].id.clone(),
            expected: s.read().unwrap().templates[0].clone(),
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
    fn partial_write_and_file_sync_failures_preserve_bytes_and_allow_retry() {
        for partial in [true, false] {
            let s = store();
            fs::create_dir_all(s.path.parent().unwrap()).unwrap();
            fs::write(&s.path, b"previous document").unwrap();
            let result = atomic_write_with(&s.path, b"replacement document", |file, bytes| {
                if partial {
                    file.write_all(&bytes[..4])?;
                } else {
                    file.write_all(bytes)?;
                }
                Err(std::io::Error::other(if partial {
                    "partial write failure"
                } else {
                    "file sync failure"
                }))
            });
            assert!(result.unwrap_err().contains("previous data is preserved"));
            assert_eq!(fs::read(&s.path).unwrap(), b"previous document");
            assert_eq!(fs::read_dir(s.path.parent().unwrap()).unwrap().count(), 1);
            atomic_write(&s.path, b"successful retry").unwrap();
            assert_eq!(fs::read(&s.path).unwrap(), b"successful retry");
            assert_eq!(fs::read_dir(s.path.parent().unwrap()).unwrap().count(), 1);
            fs::remove_dir_all(s.path.parent().unwrap()).unwrap();
        }
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
