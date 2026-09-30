use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TargetUnit {
    Reps,
    Seconds,
    Metres,
    Calories,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct Target {
    pub unit: TargetUnit,
    pub value: u32,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Exercise {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<Target>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supported_units: Option<Vec<TargetUnit>>,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    #[default]
    Emom,
    Countdown,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(default, rename = "type")]
    pub mode: Mode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<u32>,
    #[serde(default)]
    pub minutes: u32,
    pub lead_in_seconds: u32,
    pub warning_seconds: u32,
    #[serde(default)]
    pub exercises: Vec<Exercise>,
}
#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub phase: String,
    pub remaining_ms: u64,
    pub round_remaining_ms: u64,
    pub round_index: u32,
    pub exercise_index: usize,
    pub elapsed_ms: u64,
    pub paused: bool,
    pub notice: Option<String>,
    pub config: Config,
}
impl Config {
    fn duration_ms(&self) -> u64 {
        match self.mode {
            Mode::Countdown => u64::from(self.duration_seconds.unwrap_or(0)) * 1000,
            Mode::Emom => u64::from(self.minutes) * 60000,
        }
    }
}
pub fn validate(config: &Config) -> Result<(), String> {
    if config.mode == Mode::Countdown {
        if !config
            .duration_seconds
            .is_some_and(|s| (1..=86400).contains(&s))
        {
            return Err("Choose 1–86400 whole seconds.".into());
        }
    } else if !(1..=1440).contains(&config.minutes) {
        return Err("Choose 1–1440 whole minutes.".into());
    }
    if config.lead_in_seconds > 3600 || config.warning_seconds > 59 {
        return Err("Invalid lead-in or warning duration.".into());
    }
    if config.mode == Mode::Emom
        && (config.exercises.is_empty()
            || config.exercises.len() > 100
            || config.exercises.iter().any(|e| {
                e.target.as_ref().is_some_and(|target| {
                    target.value == 0
                        || target.value
                            > if target.unit == TargetUnit::Seconds {
                                86400
                            } else {
                                999999
                            }
                        || e.supported_units
                            .as_ref()
                            .is_some_and(|units| !units.contains(&target.unit))
                }) || e.name.trim().is_empty()
                    || e.name.chars().count() > 120
                    || e.description
                        .as_ref()
                        .is_some_and(|d| d.chars().count() > 2000)
            }))
    {
        return Err("Add 1–100 named exercises within the text limits.".into());
    }
    Ok(())
}
pub fn snapshot(config: &Config, elapsed: u64) -> Snapshot {
    let lead = u64::from(config.lead_in_seconds) * 1000;
    let duration = config.duration_ms();
    let active = elapsed.saturating_sub(lead);
    let completed = active >= duration;
    let round = if config.mode == Mode::Countdown {
        0
    } else {
        ((active / 60000) as u32).min(config.minutes - 1)
    };
    Snapshot {
        phase: if elapsed < lead {
            "leadIn"
        } else if completed {
            "completed"
        } else {
            "running"
        }
        .into(),
        remaining_ms: duration.saturating_sub(active),
        round_remaining_ms: if elapsed < lead {
            lead - elapsed
        } else if completed {
            0
        } else if config.mode == Mode::Countdown {
            duration - active
        } else {
            60000 - active % 60000
        },
        round_index: round,
        exercise_index: if config.mode == Mode::Countdown {
            0
        } else {
            round as usize % config.exercises.len()
        },
        elapsed_ms: active.min(duration),
        paused: false,
        notice: None,
        config: config.clone(),
    }
}
pub fn cue_at(config: &Config, elapsed_ms: u64) -> Option<&'static str> {
    let second = elapsed_ms / 1000;
    let lead = u64::from(config.lead_in_seconds);
    let end = lead + config.duration_ms() / 1000;
    if second > end {
        return None;
    }
    if second == end {
        return Some("complete");
    }
    if second == lead
        || (config.mode == Mode::Emom && second > lead && (second - lead).is_multiple_of(60))
    {
        return Some("beep");
    }
    let remaining = if second < lead {
        lead - second
    } else if config.mode == Mode::Countdown {
        end - second
    } else {
        60 - (second - lead) % 60
    };
    if remaining <= u64::from(config.warning_seconds) {
        Some("tock")
    } else {
        None
    }
}

pub struct Session {
    pub config: Config,
    pub elapsed: u64,
    pub paused: bool,
    pub cancelled: bool,
    pub notice: Option<String>,
    last_second: u64,
}
impl Session {
    pub fn new(config: Config) -> Result<Self, String> {
        validate(&config)?;
        Ok(Self {
            config,
            elapsed: 0,
            paused: false,
            cancelled: false,
            notice: None,
            last_second: 0,
        })
    }
    pub fn active(&self) -> bool {
        !self.cancelled && self.snapshot().phase != "completed"
    }
    pub fn snapshot(&self) -> Snapshot {
        let mut s = snapshot(&self.config, self.elapsed);
        if self.cancelled {
            s.phase = "cancelled".into();
        }
        s.paused = self.paused;
        s.notice = self.notice.clone();
        s
    }
    pub fn advance(&mut self, delta_ms: u64, interrupted: bool) -> Option<&'static str> {
        if !self.active() || self.paused {
            return None;
        }
        if interrupted {
            self.paused = true;
            self.notice = Some(
                "Workout paused after a system interruption. Resume when you are ready.".into(),
            );
            return None;
        }
        self.elapsed = (self.elapsed + delta_ms)
            .min(u64::from(self.config.lead_in_seconds) * 1000 + self.config.duration_ms());
        let second = self.elapsed / 1000;
        if second == self.last_second {
            return None;
        }
        self.last_second = second;
        cue_at(&self.config, self.elapsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn config() -> Config {
        Config {
            mode: Mode::Emom,
            duration_seconds: None,
            minutes: 15,
            lead_in_seconds: 10,
            warning_seconds: 3,
            exercises: vec![Exercise {
                id: "a".into(),
                name: "Squat".into(),
                description: None,
                target: None,
                supported_units: None,
            }],
        }
    }
    #[test]
    fn countdown_contract() {
        let c: Config = serde_json::from_str(
            r#"{"type":"countdown","durationSeconds":125,"leadInSeconds":2,"warningSeconds":3}"#,
        )
        .unwrap();
        assert!(validate(&c).is_ok());
        assert_eq!(snapshot(&c, 62000).round_remaining_ms, 65000);
        assert_eq!(snapshot(&c, 200000).elapsed_ms, 125000);
        let cues: Vec<_> = (0..=128).filter_map(|s| cue_at(&c, s * 1000)).collect();
        assert_eq!(cues.iter().filter(|&&c| c == "beep").count(), 1);
        assert_eq!(cues.iter().filter(|&&c| c == "complete").count(), 1);
        assert_eq!(cues.iter().filter(|&&c| c == "tock").count(), 5);
        assert_eq!(cue_at(&c, 62000), None);
    }
    #[test]
    fn countdown_bounds_and_lifecycle() {
        for duration in [1u32, 86400] {
            let c: Config = serde_json::from_value(serde_json::json!({"type":"countdown", "durationSeconds":duration,"leadInSeconds":0,"warningSeconds":0})).unwrap();
            assert!(validate(&c).is_ok());
            assert_eq!(cue_at(&c, 0), Some("beep"));
            let mut session = Session::new(c).unwrap();
            session.paused = true;
            assert_eq!(session.advance(500, false), None);
            assert_eq!(session.elapsed, 0);
            session.paused = false;
            session.advance(500, true);
            assert!(session.paused);
            assert_eq!(session.elapsed, 0);
            session.paused = false;
            assert_eq!(
                session.advance(u64::from(duration) * 1000, false),
                Some("complete")
            );
            assert_eq!(session.advance(1000, false), None);
            assert!(!session.active());
        }
        for duration in [0, 86401] {
            let c: Config = serde_json::from_value(serde_json::json!({"type":"countdown", "durationSeconds":duration,"leadInSeconds":0,"warningSeconds":0})).unwrap();
            assert!(validate(&c).is_err());
        }
        let missing: Config =
            serde_json::from_str(r#"{"type":"countdown","leadInSeconds":0,"warningSeconds":0}"#)
                .unwrap();
        assert!(validate(&missing).is_err());
        for payload in [
            r#"{"type":"unknown","leadInSeconds":0,"warningSeconds":0}"#,
            r#"{"type":"countdown","durationSeconds":1.5,"leadInSeconds":0,"warningSeconds":0}"#,
        ] {
            assert!(serde_json::from_str::<Config>(payload).is_err());
        }
    }
    #[test]
    fn target_validation_and_roundtrip() {
        let mut c = config();
        c.exercises[0].target = Some(Target {
            unit: TargetUnit::Seconds,
            value: 30,
        });
        c.exercises[0].supported_units = Some(vec![TargetUnit::Reps, TargetUnit::Seconds]);
        assert!(validate(&c).is_ok());
        let restored: Config = serde_json::from_value(serde_json::to_value(&c).unwrap()).unwrap();
        assert_eq!(restored, c);
        for payload in [
            r#"{"unit":"yards","value":10}"#,
            r#"{"unit":"reps","value":1.5}"#,
            r#"{"unit":"reps","value":-1}"#,
        ] {
            assert!(serde_json::from_str::<Target>(payload).is_err());
        }
        assert_eq!(
            snapshot(&c, 10000).config.exercises[0].target,
            c.exercises[0].target
        );
        c.exercises[0].target.as_mut().unwrap().value = 0;
        assert!(validate(&c).is_err());
        c.exercises[0].target.as_mut().unwrap().value = 86401;
        assert!(validate(&c).is_err());
        c.exercises[0].target = Some(Target {
            unit: TargetUnit::Metres,
            value: 500,
        });
        assert!(validate(&c).is_err());
        c.exercises[0].supported_units = None;
        assert!(validate(&c).is_ok());
    }
    #[test]
    fn rejects_invalid_configs() {
        let mut c = config();
        c.minutes = 0;
        assert!(validate(&c).is_err());
        c.minutes = 15;
        c.warning_seconds = 60;
        assert!(validate(&c).is_err());
        c.warning_seconds = 3;
        c.exercises.clear();
        assert!(validate(&c).is_err());
    }
    #[test]
    fn lead_in_and_round_cues_are_exact() {
        let c = config();
        assert_eq!(cue_at(&c, 6000), None);
        for t in [7000, 8000, 9000, 67000, 68000, 69000] {
            assert_eq!(cue_at(&c, t), Some("tock"));
        }
        assert_eq!(cue_at(&c, 10000), Some("beep"));
        assert_eq!(cue_at(&c, 70000), Some("beep"));
        assert_eq!(cue_at(&c, 910000), Some("complete"));
        assert_eq!(cue_at(&c, 911000), None);
    }
    #[test]
    fn zero_and_short_lead_in() {
        let mut c = config();
        c.lead_in_seconds = 0;
        assert_eq!(cue_at(&c, 0), Some("beep"));
        c.lead_in_seconds = 2;
        assert_eq!(cue_at(&c, 0), Some("tock"));
        c.warning_seconds = 0;
        assert_eq!(cue_at(&c, 1000), None);
        assert_eq!(cue_at(&c, 2000), Some("beep"));
    }
    #[test]
    fn fifteen_minute_cue_totals() {
        let c = config();
        let mut tocks = 0;
        let mut beeps = 0;
        let mut completions = 0;
        for second in 0..=910 {
            match cue_at(&c, second * 1000) {
                Some("tock") => tocks += 1,
                Some("beep") => beeps += 1,
                Some("complete") => completions += 1,
                _ => {}
            }
        }
        assert_eq!((tocks, beeps, completions), (48, 15, 1));
    }

    #[test]
    fn pause_interruption_and_cancel_do_not_advance_or_replay_cues() {
        let mut session = Session::new(config()).unwrap();
        assert_eq!(session.advance(7000, false), Some("tock"));
        assert_eq!(session.advance(50, false), None);
        session.paused = true;
        assert_eq!(session.advance(30000, false), None);
        assert_eq!(session.elapsed, 7050);
        session.paused = false;
        assert_eq!(session.advance(100, false), None);
        assert_eq!(session.advance(60000, true), None);
        assert!(session.paused);
        assert_eq!(session.elapsed, 7150);
        assert!(session.notice.is_some());
        session.paused = false;
        session.cancelled = true;
        assert_eq!(session.advance(10000, false), None);
        assert_eq!(session.snapshot().phase, "cancelled");
    }

    #[test]
    fn native_snapshot_rotation_matches_domain_contract() {
        let mut c = config();
        c.exercises = (0..3)
            .map(|i| Exercise {
                id: i.to_string(),
                name: format!("Exercise {i}"),
                description: None,
                target: None,
                supported_units: None,
            })
            .collect();
        let mut counts = [0; 3];
        for i in 0..15 {
            let s = snapshot(&c, 10000 + i * 60000);
            counts[s.exercise_index] += 1;
            assert_eq!(s.round_index, i as u32);
            assert_eq!(s.round_remaining_ms, 60000);
            assert_eq!(s.remaining_ms, 900000 - i * 60000);
        }
        assert_eq!(counts, [5, 5, 5]);
        let mut session = Session::new(c).unwrap();
        assert_eq!(session.advance(910000, false), Some("complete"));
        assert_eq!(session.advance(1000, false), None);
        assert_eq!(session.snapshot().phase, "completed");
        assert_eq!(session.snapshot().round_index, 14);
    }

    #[test]
    fn largest_warning_and_invalid_payloads() {
        let mut c = config();
        c.warning_seconds = 59;
        c.lead_in_seconds = 0;
        assert_eq!(cue_at(&c, 0), Some("beep"));
        for t in 1..60 {
            assert_eq!(cue_at(&c, t * 1000), Some("tock"));
        }
        c.exercises[0].name = "  ".into();
        assert!(validate(&c).is_err());
        c.exercises[0].name = "a".repeat(121);
        assert!(validate(&c).is_err());
        assert!(serde_json::from_str::<Config>(
            r#"{"minutes":1.5,"leadInSeconds":0,"warningSeconds":3,"exercises":[]}"#
        )
        .is_err());
    }
}
