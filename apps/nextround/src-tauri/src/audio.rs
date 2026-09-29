use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
};

pub struct Audio {
    directory: PathBuf,
    playback: Option<Child>,
    awake: Option<Child>,
}
impl Audio {
    pub fn new(directory: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        for (name, bytes) in [
            ("tock", include_bytes!("../../sounds/tock.wav").as_slice()),
            ("beep", include_bytes!("../../sounds/beep.wav").as_slice()),
            (
                "complete",
                include_bytes!("../../sounds/complete.wav").as_slice(),
            ),
        ] {
            std::fs::write(directory.join(format!("{name}.wav")), bytes)
                .map_err(|e| e.to_string())?;
        }
        Ok(Self {
            directory,
            playback: None,
            awake: None,
        })
    }
    pub fn play(&mut self, cue: &str) -> Result<(), String> {
        self.stop();
        self.playback = Some(
            Command::new("/usr/bin/afplay")
                .arg(self.directory.join(format!("{cue}.wav")))
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|e| format!("Sound unavailable: {e}"))?,
        );
        Ok(())
    }
    pub fn check(&mut self) -> Option<String> {
        if let Some(child) = self.playback.as_mut() {
            if let Ok(Some(status)) = child.try_wait() {
                self.playback = None;
                if !status.success() {
                    return Some("Sound output is unavailable. Check your audio device; the visual timer will continue.".into());
                }
            }
        }
        None
    }
    pub fn stop(&mut self) {
        if let Some(mut child) = self.playback.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    pub fn keep_awake(&mut self, enabled: bool) {
        if enabled && self.awake.is_none() {
            self.awake = Command::new("/usr/bin/caffeinate")
                .args(["-di", "-w", &std::process::id().to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .ok();
        } else if !enabled {
            if let Some(mut child) = self.awake.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}
impl Drop for Audio {
    fn drop(&mut self) {
        self.stop();
        self.keep_awake(false);
    }
}
