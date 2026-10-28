import { invoke } from '@tauri-apps/api/core';
import { native } from './adapter';

export type SpotifyTrack = { name: string; artist: string; artworkUrl: string | null };
export type SpotifyNowPlaying = { track: SpotifyTrack | null; notice: string | null };
export const spotifyPollMs = 2500;
// Browser builds cannot script Spotify, so the feature reports itself as unavailable there.
export async function spotifySettings(): Promise<{ enabled: boolean; installed: boolean }> {
  return native ? invoke('spotify_settings') : { enabled: false, installed: false };
}
export async function setSpotifyEnabled(enabled: boolean): Promise<string | null> {
  if (!native) throw new Error('Spotify control is available in the installed macOS app.');
  return invoke('set_spotify_enabled', { enabled });
}
export async function spotifyNowPlaying(): Promise<SpotifyNowPlaying> {
  return native ? invoke('spotify_now_playing') : { track: null, notice: null };
}
