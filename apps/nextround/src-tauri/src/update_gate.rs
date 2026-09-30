#[derive(Default)]
pub struct UpdateGate {
    pub busy: bool,
    pub restart_ready: bool,
}
impl UpdateGate {
    pub fn allows_exit(&self, code: Option<i32>) -> bool {
        !self.busy || (self.restart_ready && code == Some(tauri::RESTART_EXIT_CODE))
    }
    #[cfg(any(feature = "direct-update", test))]
    pub fn begin(&mut self, active: bool) -> Result<(), String> {
        if active {
            return Err("Finish or stop your workout before installing an update.".into());
        }
        if self.busy {
            return Err("An update is already being installed.".into());
        }
        self.busy = true;
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn active_or_paused_workout_blocks_install() {
        let mut gate = UpdateGate::default();
        assert!(gate.begin(true).is_err());
        assert!(!gate.busy);
    }
    #[test]
    fn only_one_installer_reserves_the_gate() {
        let mut gate = UpdateGate::default();
        assert!(gate.begin(false).is_ok());
        assert!(gate.begin(false).is_err());
        gate.busy = false;
        assert!(gate.begin(false).is_ok());
    }
}

#[cfg(test)]
mod exit_tests {
    use super::*;
    #[test]
    fn installation_blocks_quit_but_completed_install_allows_only_restart() {
        let mut gate = UpdateGate::default();
        gate.begin(false).unwrap();
        assert!(!gate.allows_exit(None));
        assert!(!gate.allows_exit(Some(tauri::RESTART_EXIT_CODE)));
        gate.restart_ready = true;
        assert!(!gate.allows_exit(None));
        assert!(gate.allows_exit(Some(tauri::RESTART_EXIT_CODE)));
    }
}
