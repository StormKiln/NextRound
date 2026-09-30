/** Lifecycle triggers are throttled by the update store, including native focus events. */
export function scheduleAutomaticUpdates(
  check: () => void,
  environment: { window: EventTarget; document: EventTarget; visible: () => boolean },
): () => void {
  const whenVisible = () => {
    if (environment.visible()) check();
  };
  environment.window.addEventListener('focus', whenVisible);
  environment.window.addEventListener('online', whenVisible);
  environment.document.addEventListener('visibilitychange', whenVisible);
  const timer = setInterval(whenVisible, 15 * 60_000);
  whenVisible();
  return () => {
    clearInterval(timer);
    environment.window.removeEventListener('focus', whenVisible);
    environment.window.removeEventListener('online', whenVisible);
    environment.document.removeEventListener('visibilitychange', whenVisible);
  };
}
