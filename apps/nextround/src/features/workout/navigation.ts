export async function returnToSetup(
  exitFullscreen: () => Promise<void>,
  navigate: () => void,
  report: (message: string) => void,
) {
  try {
    await exitFullscreen();
  } catch {
    report('Could not exit full screen. You can still configure your next workout.');
  } finally {
    navigate();
  }
}
