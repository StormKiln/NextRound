use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CloseBehavior {
    #[default]
    Minimize,
    Quit,
}
#[derive(Debug, PartialEq)]
pub enum CloseAction {
    Block,
    Minimize,
    ConfirmQuit,
    Quit,
}
pub fn close_action(behavior: CloseBehavior, installing: bool, active: bool) -> CloseAction {
    if installing {
        CloseAction::Block
    } else if behavior == CloseBehavior::Minimize {
        CloseAction::Minimize
    } else if active {
        CloseAction::ConfirmQuit
    } else {
        CloseAction::Quit
    }
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stored {
    version: u32,
    close_behavior: CloseBehavior,
}
pub struct Preferences {
    pub behavior: CloseBehavior,
    path: PathBuf,
}
impl Preferences {
    pub fn load(path: PathBuf) -> Self {
        let behavior = std::fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Stored>(&bytes).ok())
            .filter(|stored| stored.version == 1)
            .map(|stored| stored.close_behavior)
            .unwrap_or_default();
        Self { behavior, path }
    }
    pub fn save(&mut self, behavior: CloseBehavior) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or("Settings directory is unavailable")?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let bytes = serde_json::to_vec(&Stored {
            version: 1,
            close_behavior: behavior,
        })
        .map_err(|e| e.to_string())?;
        let temporary = self.path.with_extension("json.tmp");
        let result = (|| -> std::io::Result<()> {
            use std::io::Write;
            let mut file = std::fs::File::create(&temporary)?;
            file.write_all(&bytes)?;
            file.sync_all()?;
            std::fs::rename(&temporary, &self.path)
        })();
        if let Err(error) = result {
            let _ = std::fs::remove_file(&temporary);
            return Err(error.to_string());
        }
        self.behavior = behavior;
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn minimize_keeps_running_and_paused_sessions_alive() {
        assert_eq!(
            close_action(CloseBehavior::Minimize, false, false),
            CloseAction::Minimize
        );
        assert_eq!(
            close_action(CloseBehavior::Minimize, false, true),
            CloseAction::Minimize
        );
        assert_eq!(
            close_action(CloseBehavior::Quit, false, true),
            CloseAction::ConfirmQuit
        );
        assert_eq!(
            close_action(CloseBehavior::Quit, false, false),
            CloseAction::Quit
        );
        for behavior in [CloseBehavior::Minimize, CloseBehavior::Quit] {
            assert_eq!(close_action(behavior, true, false), CloseAction::Block);
            assert_eq!(close_action(behavior, true, true), CloseAction::Block);
        }
    }
    #[test]
    fn preference_survives_restart_and_rejects_failed_write() {
        let root =
            std::env::temp_dir().join(format!("nextround-window-test-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join("window.json");
        let mut prefs = Preferences::load(path.clone());
        assert_eq!(prefs.behavior, CloseBehavior::Minimize);
        prefs.save(CloseBehavior::Quit).unwrap();
        assert_eq!(
            Preferences::load(path.clone()).behavior,
            CloseBehavior::Quit
        );
        std::fs::write(&path, b"invalid settings").unwrap();
        assert_eq!(Preferences::load(path).behavior, CloseBehavior::Minimize);
        let blocked = root.join("file");
        std::fs::write(&blocked, b"not a directory").unwrap();
        let mut failed = Preferences::load(blocked.join("window.json"));
        assert!(failed.save(CloseBehavior::Quit).is_err());
        assert_eq!(failed.behavior, CloseBehavior::Minimize);
        std::fs::remove_dir_all(root).unwrap();
    }
}
