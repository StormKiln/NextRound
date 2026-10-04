import {
  cueAt,
  ladderTotalMovements,
  type SessionSnapshot,
  snapshotAt,
  validateConfig,
  type WorkoutConfig,
  type WorkoutCue,
} from '@nextround/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import beepUrl from '../../sounds/beep.wav';
import completeUrl from '../../sounds/complete.wav';
import restUrl from '../../sounds/rest.wav';
import tockUrl from '../../sounds/tock.wav';

let browserSession: SessionSnapshot | null = null;
let elapsed = 0;
let anchor = 0;
let lastSecond = -1;
let playback: HTMLAudioElement | null = null;
let browserLoop: ReturnType<typeof setInterval> | undefined;
function stopSound() {
  playback?.pause();
  playback = null;
}
function play(cue: WorkoutCue) {
  stopSound();
  playback = new Audio({ tock: tockUrl, beep: beepUrl, rest: restUrl, complete: completeUrl }[cue]);
  void playback.play().catch(() => {
    if (browserSession)
      browserSession.notice =
        'Sound is unavailable. Check your audio output; the visual timer will continue.';
  });
}
function tickBrowser() {
  if (
    !browserSession ||
    browserSession.paused ||
    ['completed', 'cancelled'].includes(browserSession.phase)
  )
    return;
  const now = performance.now();
  const delta = now - anchor;
  anchor = now;
  if (delta > 2000) {
    browserSession.paused = true;
    browserSession.notice =
      'Workout paused after a system interruption. Resume when you are ready.';
    stopSound();
    return;
  }
  elapsed += delta;
  const notice = browserSession.notice;
  const ladderCompletedMovements = browserSession.ladderCompletedMovements;
  browserSession = { ...snapshotAt(browserSession.config, elapsed), notice, ...(ladderCompletedMovements !== undefined ? {ladderCompletedMovements} : {}) };
  const second = Math.floor(elapsed / 1000);
  if (lastSecond === second) return;
  lastSecond = second;
  const cue = cueAt(
    browserSession.config,
    Math.min(
      elapsed,
      browserSession.config.leadInSeconds * 1000 +
        browserSession.elapsedMs +
        browserSession.remainingMs,
    ),
  );
  if (cue) play(cue);
  if (browserSession.phase === 'completed') clearInterval(browserLoop);
}
export const native = isTauri();
export async function startWorkout(config: WorkoutConfig): Promise<SessionSnapshot> {
  if (native) return invoke('start_workout', { config });
  if (Object.keys(validateConfig(config)).length)
    throw new Error('Check the workout configuration.');
  clearInterval(browserLoop);
  elapsed = 0;
  anchor = performance.now();
  lastSecond = -1;
  browserSession = snapshotAt(structuredClone(config), 0);
  tickBrowser();
  browserLoop = setInterval(tickBrowser, 50);
  return browserSession;
}
export async function controlWorkout(
  action: 'pause' | 'resume' | 'stop' | 'finish' | 'advance' | 'undo',
): Promise<SessionSnapshot> {
  if (native) return invoke('control_workout', { action });
  tickBrowser();
  if (!browserSession) throw new Error('No active workout.');
  if (['completed', 'cancelled'].includes(browserSession.phase))
    throw new Error('Your workout has completed or stopped. Save or discard any result.');
  if (action === 'advance' || action === 'undo') {
    const config = browserSession.config;
    const completed = browserSession.ladderCompletedMovements ?? 0;
    if (config.type !== 'ladder' || browserSession.phase !== 'running' || (action === 'advance' ? completed >= ladderTotalMovements(config) : completed === 0)) throw new Error('This movement action is unavailable.');
    const next = completed + (action === 'advance' ? 1 : -1);
    browserSession.ladderCompletedMovements = next;
    if(next === ladderTotalMovements(config)) browserSession.paused = true;
    else if(action === 'advance' && next % config.exercises.length === 0) play('beep');
    return {...browserSession};
  }
  if (
    action === 'finish' &&
    ((browserSession.config.type !== 'forTime' && browserSession.config.type !== 'ladder') || browserSession.phase !== 'running' || (browserSession.config.type === 'ladder' && browserSession.ladderCompletedMovements !== ladderTotalMovements(browserSession.config)))
  )
    throw new Error('Finish is available only after a For Time workout starts.');
  stopSound();
  if (action === 'finish') {
    browserSession = {
      ...browserSession,
      phase: 'completed',
      paused: false,
      elapsedMs: Math.floor(browserSession.elapsedMs),
      outcome: 'finished',
    };
    clearInterval(browserLoop);
    play('complete');
  } else if (action === 'stop') {
    browserSession.phase = 'cancelled';
    clearInterval(browserLoop);
  } else {
    browserSession.paused = action === 'pause';
    anchor = performance.now();
  }
  return { ...browserSession };
}
export async function readWorkout(): Promise<SessionSnapshot | null> {
  return native ? invoke('read_workout') : browserSession ? { ...browserSession } : null;
}
export async function fullscreen(enabled: boolean) {
  if (native) await getCurrentWindow().setFullscreen(enabled);
}

export async function resolveResult() {
  if (native) await invoke('resolve_workout_result');
}
