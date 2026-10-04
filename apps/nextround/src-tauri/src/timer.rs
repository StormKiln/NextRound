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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_id: Option<String>,
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
    Amrap,
    Intervals,
    #[serde(rename = "forTime")]
    ForTime,
    Ladder,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LadderPattern {
    pub direction: String,
    pub start_reps: u32,
    pub increment: u32,
    pub rungs: u32,
}
impl LadderPattern {
    pub fn reps(&self) -> Result<Vec<u32>, String> {
        if !["ascending", "descending", "pyramid"].contains(&self.direction.as_str())
            || !(1..=1000).contains(&self.start_reps)
            || !(1..=1000).contains(&self.increment)
            || !(1..=50).contains(&self.rungs)
        {
            return Err("Choose start/increment 1–1000 and 1–50 rungs.".into());
        }
        let mut reps = Vec::new();
        for i in 0..self.rungs {
            let change = i * self.increment;
            let n = if self.direction == "descending" {
                self.start_reps
                    .checked_sub(change)
                    .filter(|n| *n > 0)
                    .ok_or("Every rung needs at least one rep.")?
            } else {
                self.start_reps + change
            };
            reps.push(n);
        }
        if self.direction == "pyramid" {
            let tail: Vec<u32> = reps[..reps.len() - 1].iter().rev().copied().collect();
            reps.extend(tail);
        }
        Ok(reps)
    }
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ladder: Option<LadderPattern>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_cap_seconds: Option<u32>,
    #[serde(default, rename = "type")]
    pub mode: Mode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<u32>,
    #[serde(default)]
    pub minutes: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub work_seconds: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rest_seconds: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rounds: Option<u32>,
    pub lead_in_seconds: u32,
    pub warning_seconds: u32,
    #[serde(default)]
    pub exercises: Vec<Exercise>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_checklist: Option<bool>,
}
#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ladder_completed_movements: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    pub phase: String,
    pub remaining_ms: u64,
    pub round_remaining_ms: u64,
    pub interval_phase: Option<String>,
    pub round_index: u32,
    pub exercise_index: usize,
    pub elapsed_ms: u64,
    pub paused: bool,
    pub notice: Option<String>,
    pub config: Config,
}
impl Config {
    pub fn ladder_total(&self) -> u32 {
        self.ladder
            .as_ref()
            .and_then(|p| p.reps().ok())
            .map_or(0, |r| r.len() as u32 * self.exercises.len() as u32)
    }
    pub(crate) fn duration_ms(&self) -> u64 {
        match self.mode {
            Mode::Countdown | Mode::Amrap => u64::from(self.duration_seconds.unwrap_or(0)) * 1000,
            Mode::Intervals => {
                let rounds = u64::from(self.rounds.unwrap_or(0));
                (rounds * u64::from(self.work_seconds.unwrap_or(0))
                    + rounds.saturating_sub(1) * u64::from(self.rest_seconds.unwrap_or(0)))
                    * 1000
            }
            Mode::ForTime | Mode::Ladder => self
                .time_cap_seconds
                .map(|s| u64::from(s) * 1000)
                .unwrap_or(u64::MAX - 3_600_000),
            Mode::Emom => u64::from(self.minutes) * 60000,
        }
    }
}
pub fn validate(config: &Config) -> Result<(), String> {
    if matches!(config.mode, Mode::ForTime | Mode::Ladder) {
        if config
            .time_cap_seconds
            .is_some_and(|s| !(1..=86400).contains(&s))
        {
            return Err("Choose a whole time cap from 1 to 86400 seconds.".into());
        }
    } else if config.mode == Mode::Intervals {
        if !config
            .work_seconds
            .is_some_and(|s| (1..=86400).contains(&s))
            || !config.rest_seconds.is_some_and(|s| s <= 86400)
            || !config.rounds.is_some_and(|s| (1..=1440).contains(&s))
            || config.duration_ms() > 86400000
        {
            return Err("Choose work 1–86400 seconds, rest 0–86400, rounds 1–1440 and a total within 24 hours.".into());
        }
    } else if matches!(
        config.mode,
        Mode::Countdown | Mode::Amrap | Mode::ForTime | Mode::Ladder
    ) {
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
    if config.mode == Mode::Ladder {
        config
            .ladder
            .as_ref()
            .ok_or("Ladder pattern required.")?
            .reps()?;
    }
    let mut ids = std::collections::HashSet::new();
    if (!matches!(config.mode, Mode::Countdown | Mode::ForTime) && config.exercises.is_empty())
        || config.exercises.len() > 100
        || config.exercises.iter().any(|e| {
            e.id.trim().is_empty()
                || e.catalog_id
                    .as_ref()
                    .is_some_and(|id| id.trim().is_empty() || id.chars().count() > 120)
                || !ids.insert(&e.id)
                || (config.mode == Mode::Ladder
                    && (e.target.is_some()
                        || e.supported_units
                            .as_ref()
                            .is_some_and(|u| !u.contains(&TargetUnit::Reps))))
                || (config.mode == Mode::Amrap && e.target.is_none())
                || e.target.as_ref().is_some_and(|target| {
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
                })
                || e.name.trim().is_empty()
                || e.name.chars().count() > 120
                || e.description
                    .as_ref()
                    .is_some_and(|d| d.chars().count() > 2000)
        })
    {
        return Err("Use up to 100 named exercises with unique IDs within the text limits.".into());
    }
    Ok(())
}
pub fn snapshot(config: &Config, elapsed: u64) -> Snapshot {
    let lead = u64::from(config.lead_in_seconds) * 1000;
    let duration = config.duration_ms();
    let active = elapsed.saturating_sub(lead);
    let completed = active >= duration;
    let cycle = if config.mode == Mode::Intervals {
        u64::from(config.work_seconds.unwrap() + config.rest_seconds.unwrap()) * 1000
    } else {
        60000
    };
    let resting = config.mode == Mode::Intervals
        && !completed
        && elapsed >= lead
        && active % cycle >= u64::from(config.work_seconds.unwrap()) * 1000;
    let round = if matches!(
        config.mode,
        Mode::Countdown | Mode::Amrap | Mode::ForTime | Mode::Ladder
    ) {
        0
    } else {
        ((active / cycle) as u32).min(if config.mode == Mode::Intervals {
            config.rounds.unwrap() - 1
        } else {
            config.minutes - 1
        })
    };
    Snapshot {
        ladder_completed_movements: (config.mode == Mode::Ladder).then_some(0),
        outcome: (matches!(config.mode, Mode::ForTime | Mode::Ladder) && completed)
            .then(|| "timeCapReached".into()),
        phase: if elapsed < lead {
            "leadIn"
        } else if completed {
            "completed"
        } else {
            "running"
        }
        .into(),
        remaining_ms: if matches!(config.mode, Mode::ForTime | Mode::Ladder)
            && config.time_cap_seconds.is_none()
        {
            0
        } else {
            duration.saturating_sub(active)
        },
        round_remaining_ms: if elapsed < lead {
            lead - elapsed
        } else if completed {
            0
        } else if matches!(
            config.mode,
            Mode::Countdown | Mode::Amrap | Mode::ForTime | Mode::Ladder
        ) {
            if matches!(config.mode, Mode::ForTime | Mode::Ladder)
                && config.time_cap_seconds.is_none()
            {
                0
            } else {
                duration - active
            }
        } else {
            (if config.mode == Mode::Intervals && !resting {
                u64::from(config.work_seconds.unwrap()) * 1000
            } else {
                cycle
            }) - active % cycle
        },
        interval_phase: (config.mode == Mode::Intervals)
            .then(|| if resting { "rest" } else { "work" }.into()),
        round_index: round,
        exercise_index: if matches!(
            config.mode,
            Mode::Countdown | Mode::Amrap | Mode::ForTime | Mode::Ladder
        ) {
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
    if config.mode == Mode::Intervals && second >= lead {
        let work = u64::from(config.work_seconds.unwrap());
        let cycle = work + u64::from(config.rest_seconds.unwrap());
        let position = (second - lead) % cycle;
        if position == 0 {
            return Some("beep");
        }
        if position == work {
            return Some("rest");
        }
        let remaining = (if position < work { work } else { cycle }) - position;
        return (remaining <= u64::from(config.warning_seconds)).then_some("tock");
    }
    if second == lead
        || (config.mode == Mode::Emom && second > lead && (second - lead).is_multiple_of(60))
    {
        return Some("beep");
    }
    let remaining = if second < lead {
        lead - second
    } else if matches!(
        config.mode,
        Mode::Countdown | Mode::Amrap | Mode::ForTime | Mode::Ladder
    ) {
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
    pub result_resolved: bool,
    pub notice: Option<String>,
    last_second: u64,
    finished: bool,
    completed_movements: u32,
}
impl Session {
    pub fn new(config: Config) -> Result<Self, String> {
        validate(&config)?;
        Ok(Self {
            config,
            elapsed: 0,
            paused: false,
            cancelled: false,
            result_resolved: false,
            notice: None,
            last_second: 0,
            finished: false,
            completed_movements: 0,
        })
    }
    pub fn needs_result_decision(&self) -> bool {
        !self.cancelled && !self.result_resolved && self.snapshot().phase == "completed"
    }
    pub fn progress(&mut self, undo: bool) -> Result<Option<&'static str>, String> {
        if self.config.mode != Mode::Ladder
            || self.snapshot().phase != "running"
            || if undo {
                self.completed_movements == 0
            } else {
                self.completed_movements >= self.config.ladder_total()
            }
        {
            return Err("This movement action is unavailable.".into());
        }
        if undo {
            self.completed_movements -= 1;
        } else {
            self.completed_movements += 1;
        }
        if self.completed_movements == self.config.ladder_total() {
            self.paused = true;
            return Ok(None);
        }
        Ok((!undo
            && self
                .completed_movements
                .is_multiple_of(self.config.exercises.len() as u32))
        .then_some("beep"))
    }
    pub fn finish(&mut self) -> Result<(), String> {
        if !matches!(self.config.mode, Mode::ForTime | Mode::Ladder)
            || self.snapshot().phase != "running"
            || (self.config.mode == Mode::Ladder
                && self.completed_movements != self.config.ladder_total())
        {
            return Err(
                "Finish is available during For Time or after all Ladder movements are complete."
                    .into(),
            );
        }
        self.finished = true;
        self.paused = false;
        Ok(())
    }
    pub fn stop(&mut self) -> Result<(), String> {
        if self.snapshot().phase == "completed" {
            return Err("Your workout has completed. Save or discard its result.".into());
        }
        self.cancelled = true;
        self.paused = false;
        Ok(())
    }
    pub fn active(&self) -> bool {
        !self.cancelled && self.snapshot().phase != "completed"
    }
    pub fn snapshot(&self) -> Snapshot {
        let mut s = snapshot(&self.config, self.elapsed);
        if self.config.mode == Mode::Ladder {
            s.ladder_completed_movements = Some(self.completed_movements);
            s.round_index = self.completed_movements / self.config.exercises.len() as u32;
            s.exercise_index = self.completed_movements as usize % self.config.exercises.len();
        }
        if self.finished {
            s.phase = "completed".into();
            s.outcome = Some("finished".into());
        }
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
        self.elapsed = (self.elapsed.saturating_add(delta_ms))
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
    #[test]
    fn ladder_controls_pause_finish_and_cap() {
        let raw = serde_json::json!({"type":"ladder","ladder":{"direction":"pyramid","startReps":2,"increment":2,"rungs":2},"leadInSeconds":1,"warningSeconds":0,"exercises":[{"id":"a","name":"Squat"}]});
        let mut session = Session::new(serde_json::from_value(raw.clone()).unwrap()).unwrap();
        assert!(session.progress(false).is_err());
        session.advance(1000, false);
        assert_eq!(session.progress(false).unwrap(), Some("beep"));
        assert_eq!(session.snapshot().ladder_completed_movements, Some(1));
        session.progress(true).unwrap();
        assert_eq!(session.snapshot().ladder_completed_movements, Some(0));
        session.progress(false).unwrap();
        session.progress(false).unwrap();
        assert!(session.finish().is_err());
        assert_eq!(session.progress(false).unwrap(), None);
        assert!(session.paused);
        assert_eq!(session.snapshot().ladder_completed_movements, Some(3));
        session.advance(1000, false);
        assert_eq!(session.snapshot().elapsed_ms, 0);
        session.finish().unwrap();
        assert!(!session.active());
        assert!(session.progress(true).is_err());
        let mut capped = raw;
        capped["timeCapSeconds"] = serde_json::json!(1);
        let mut session = Session::new(serde_json::from_value(capped).unwrap()).unwrap();
        session.advance(2000, false);
        assert!(session.progress(false).is_err());
        assert!(session.finish().is_err());
        assert_eq!(
            session.snapshot().outcome.as_deref(),
            Some("timeCapReached")
        );
    }
    #[test]
    fn amrap_has_one_cap_and_requires_targets() {
        let mut raw = serde_json::json!({"type":"amrap","durationSeconds":125,"leadInSeconds":2,"warningSeconds":3,"exercises":[{"id":"a","name":"Row","target":{"unit":"metres","value":100}}]});
        let c: Config = serde_json::from_value(raw.clone()).unwrap();
        assert!(validate(&c).is_ok());
        assert_eq!(snapshot(&c, 62000).remaining_ms, 65000);
        assert_eq!(snapshot(&c, 62000).round_remaining_ms, 65000);
        assert_eq!(cue_at(&c, 62000), None);
        assert_eq!(cue_at(&c, 127000), Some("complete"));
        raw["exercises"][0]
            .as_object_mut()
            .unwrap()
            .remove("target");
        assert!(validate(&serde_json::from_value(raw).unwrap()).is_err());
    }
    #[test]
    fn for_time_finish_pause_and_cap_are_distinct() {
        let raw = serde_json::json!({"type":"forTime","leadInSeconds":2,"warningSeconds":3});
        let config: Config = serde_json::from_value(raw.clone()).unwrap();
        let mut session = Session::new(config).unwrap();
        assert!(session.finish().is_err());
        assert_eq!(session.advance(2000, false), Some("beep"));
        session.advance(1234, false);
        session.paused = true;
        session.advance(2000, false);
        assert_eq!(session.snapshot().elapsed_ms, 1234);
        assert!(session.finish().is_ok());
        assert_eq!(session.snapshot().outcome.as_deref(), Some("finished"));
        assert_eq!(session.snapshot().phase, "completed");
        assert!(!session.active());
        assert!(session.finish().is_err());
        assert_eq!(session.advance(5000, false), None);
        let mut capped = raw;
        capped["timeCapSeconds"] = serde_json::json!(5);
        let mut session = Session::new(serde_json::from_value(capped).unwrap()).unwrap();
        assert_eq!(session.advance(7000, false), Some("complete"));
        assert!(session.finish().is_err());
        assert_eq!(
            session.snapshot().outcome.as_deref(),
            Some("timeCapReached")
        );
        assert_eq!(session.snapshot().elapsed_ms, 5000);
    }
    #[test]
    fn for_time_uncapped_has_no_minute_cues_or_elapsed_limit() {
        let c: Config = serde_json::from_value(
            serde_json::json!({"type":"forTime","leadInSeconds":2,"warningSeconds":59}),
        )
        .unwrap();
        assert!(validate(&c).is_ok());
        assert_eq!(snapshot(&c, 7202500).elapsed_ms, 7200500);
        assert_eq!(snapshot(&c, 7202500).remaining_ms, 0);
        assert_eq!(snapshot(&c, 7202500).phase, "running");
        assert_eq!(cue_at(&c, 62000), None);
        for cap in [0, 86401] {
            let c: Config = serde_json::from_value(serde_json::json!({"type":"forTime","timeCapSeconds":cap,"leadInSeconds":0,"warningSeconds":0})).unwrap();
            assert!(validate(&c).is_err());
        }
    }
    fn config() -> Config {
        Config {
            time_cap_seconds: None,
            ladder: None,
            mode: Mode::Emom,
            show_checklist: None,
            duration_seconds: None,
            minutes: 15,
            work_seconds: None,
            rest_seconds: None,
            rounds: None,
            lead_in_seconds: 10,
            warning_seconds: 3,
            exercises: vec![Exercise {
                id: "a".into(),
                name: "Squat".into(),
                catalog_id: None,
                description: None,
                target: None,
                supported_units: None,
            }],
        }
    }
    #[test]
    fn stop_at_completion_preserves_result_until_explicit_resolution() {
        let mut session = Session::new(config()).unwrap();
        session.advance(910000, false);
        assert!(session.stop().is_err());
        assert_eq!(session.snapshot().phase, "completed");
        assert!(session.needs_result_decision());
        let mut active = Session::new(config()).unwrap();
        assert!(active.stop().is_ok());
        assert_eq!(active.snapshot().phase, "cancelled");
    }
    #[test]
    fn completed_result_requires_resolution_before_leaving() {
        let mut s = Session::new(config()).unwrap();
        assert!(!s.needs_result_decision());
        s.advance(910000, false);
        assert!(s.needs_result_decision());
        s.result_resolved = true;
        assert!(!s.needs_result_decision());
        s.result_resolved = false;
        s.cancelled = true;
        assert!(!s.needs_result_decision());
    }
    #[test]
    fn intervals_validate_bounds_and_zero_rest() {
        let base = serde_json::json!({"type":"intervals","workSeconds":4,"restSeconds":0,"rounds":2,"leadInSeconds":0,"warningSeconds":59,"exercises":[{"id":"a","name":"Squat"}]});
        let c: Config = serde_json::from_value(base.clone()).unwrap();
        assert!(validate(&c).is_ok());
        assert_eq!(cue_at(&c, 4000), Some("beep"));
        assert_eq!(cue_at(&c, 8000), Some("complete"));
        assert_eq!(snapshot(&c, 4000).round_index, 1);
        for (key, value) in [
            ("workSeconds", 0),
            ("workSeconds", 86401),
            ("restSeconds", 86401),
            ("rounds", 0),
            ("rounds", 1441),
        ] {
            let mut raw = base.clone();
            raw[key] = serde_json::json!(value);
            assert!(validate(&serde_json::from_value(raw).unwrap()).is_err());
        }
        let mut raw = base.clone();
        raw["workSeconds"] = serde_json::json!(86400);
        assert!(validate(&serde_json::from_value(raw.clone()).unwrap()).is_err());
        raw["rounds"] = serde_json::json!(1);
        assert!(validate(&serde_json::from_value(raw).unwrap()).is_ok());
        let mut raw = base;
        raw.as_object_mut().unwrap().remove("restSeconds");
        assert!(validate(&serde_json::from_value(raw).unwrap()).is_err());
    }
    #[test]
    fn interval_contract_and_pause() {
        let c: Config = serde_json::from_value(serde_json::json!({"type":"intervals","workSeconds":4,"restSeconds":2,"rounds":2,"leadInSeconds":2,"warningSeconds":1,"exercises":[{"id":"a","name":"Squat"},{"id":"b","name":"Push-up"}]})).unwrap();
        assert!(validate(&c).is_ok());
        assert_eq!(snapshot(&c, 0).remaining_ms, 10000);
        assert_eq!(snapshot(&c, 6000).round_remaining_ms, 2000);
        assert_eq!(snapshot(&c, 8000).exercise_index, 1);
        assert_eq!(snapshot(&c, 12000).phase, "completed");
        let cues: Vec<_> = (0..=13).map(|s| cue_at(&c, s * 1000)).collect();
        assert_eq!(
            cues,
            vec![
                None,
                Some("tock"),
                Some("beep"),
                None,
                None,
                Some("tock"),
                Some("rest"),
                Some("tock"),
                Some("beep"),
                None,
                None,
                Some("tock"),
                Some("complete"),
                None
            ]
        );
        let mut session = Session::new(c).unwrap();
        assert_eq!(session.advance(6000, false), Some("rest"));
        session.paused = true;
        assert_eq!(session.advance(5000, false), None);
        assert_eq!(session.elapsed, 6000);
        session.paused = false;
        assert_eq!(session.advance(2000, true), None);
        assert!(session.paused);
        session.paused = false;
        assert_eq!(session.advance(2000, false), Some("beep"));
        assert_eq!(session.advance(4000, false), Some("complete"));
        assert_eq!(session.advance(1000, false), None);
    }
    #[test]
    fn countdown_exercises_validate_and_roundtrip() {
        let mut c: Config = serde_json::from_value(serde_json::json!({"type":"countdown","durationSeconds":30,"leadInSeconds":0,"warningSeconds":3,"showChecklist":false,"exercises":[{"id":"a","name":"Squat","target":{"unit":"reps","value":5}}]})).unwrap();
        assert!(validate(&c).is_ok());
        let encoded = serde_json::to_value(&c).unwrap();
        assert_eq!(encoded["showChecklist"], false);
        assert_eq!(serde_json::from_value::<Config>(encoded).unwrap(), c);
        c.exercises.push(c.exercises[0].clone());
        assert!(validate(&c).is_err());
        c.exercises.pop();
        c.exercises[0].target.as_mut().unwrap().value = 0;
        assert!(validate(&c).is_err());
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
                catalog_id: None,
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
