import { expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false, invoke }));

import { setSpotifyEnabled, spotifyNowPlaying, spotifySettings } from './spotify';

it('browser builds never script Spotify', async () => {
  await expect(spotifySettings()).resolves.toEqual({ enabled: false, installed: false });
  await expect(spotifyNowPlaying()).resolves.toEqual({ track: null, notice: null });
  await expect(setSpotifyEnabled(true)).rejects.toThrow('installed macOS app');
  expect(invoke).not.toHaveBeenCalled();
});
