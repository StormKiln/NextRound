use std::{ffi::c_void, ptr::NonNull};

extern "C" {
    fn nr_audio_create(bytes: *const u8, length: usize) -> *mut c_void;
    fn nr_audio_play(handle: *mut c_void) -> i32;
    fn nr_audio_stop(handle: *mut c_void);
    fn nr_audio_destroy(handle: *mut c_void);
    fn nr_awake_create(identifier: *mut u32) -> i32;
    fn nr_awake_release(identifier: u32) -> i32;
}

fn cue_bytes(cue: &str) -> Result<&'static [u8], String> {
    match cue {
        "tock" => Ok(include_bytes!("../../sounds/tock.wav")),
        "beep" => Ok(include_bytes!("../../sounds/beep.wav")),
        "complete" => Ok(include_bytes!("../../sounds/complete.wav")),
        _ => Err("Unknown audio cue".into()),
    }
}
struct Player(NonNull<c_void>);
// The player has no main-thread affinity. All access is serialized by Runtime's mutex.
unsafe impl Send for Player {}
impl Drop for Player {
    fn drop(&mut self) {
        unsafe { nr_audio_destroy(self.0.as_ptr()) }
    }
}
pub struct Audio {
    players: Vec<(&'static str, Player)>,
    awake: Option<u32>,
}
impl Audio {
    pub fn new() -> Result<Self, String> {
        // Initialize players lazily so a missing audio device cannot prevent app startup.
        Ok(Self {
            players: Vec::new(),
            awake: None,
        })
    }
    pub fn play(&mut self, cue: &str) -> Result<(), String> {
        let bytes = cue_bytes(cue)?;
        self.stop();
        if !self.players.iter().any(|(name, _)| *name == cue) {
            let pointer = NonNull::new(unsafe { nr_audio_create(bytes.as_ptr(), bytes.len()) })
                .ok_or("Sound output is unavailable. The visual timer will continue.")?;
            let name = match cue {
                "tock" => "tock",
                "beep" => "beep",
                _ => "complete",
            };
            self.players.push((name, Player(pointer)));
        }
        let player = &self
            .players
            .iter()
            .find(|(name, _)| *name == cue)
            .unwrap()
            .1;
        if unsafe { nr_audio_play(player.0.as_ptr()) } == 0 {
            return Err("Sound output is unavailable. Check your audio device; the visual timer will continue.".into());
        }
        Ok(())
    }
    pub fn stop(&mut self) {
        for (_, player) in &self.players {
            unsafe { nr_audio_stop(player.0.as_ptr()) }
        }
    }
    pub fn keep_awake(&mut self, enabled: bool) -> Result<(), String> {
        if enabled && self.awake.is_none() {
            let mut id = 0;
            if unsafe { nr_awake_create(&mut id) } != 0 {
                return Err(
                    "Sleep prevention is unavailable. Keep your Mac awake during this workout."
                        .into(),
                );
            }
            self.awake = Some(id);
        } else if !enabled {
            if let Some(id) = self.awake {
                if unsafe { nr_awake_release(id) } != 0 {
                    return Err("Unable to release the workout sleep assertion.".into());
                }
                self.awake = None;
            }
        }
        Ok(())
    }
}
impl Drop for Audio {
    fn drop(&mut self) {
        self.stop();
        let _ = self.keep_awake(false);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_unknown_cues() {
        assert!(cue_bytes("../other").is_err());
        for cue in ["tock", "beep", "complete"] {
            assert_eq!(&cue_bytes(cue).unwrap()[..4], b"RIFF");
        }
    }
    #[test]
    #[ignore = "requires an interactive macOS audio/power session"]
    fn native_audio_and_power_lifecycle() {
        let mut audio = Audio::new().unwrap();
        audio.keep_awake(true).unwrap();
        let id = audio.awake.unwrap();
        audio.keep_awake(true).unwrap();
        assert_eq!(audio.awake, Some(id));
        for cue in ["tock", "beep", "complete"] {
            audio.play(cue).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(500));
            audio.stop();
        }
        audio.keep_awake(false).unwrap();
        assert!(audio.awake.is_none());
    }
}
