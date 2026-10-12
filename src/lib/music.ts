import { EXERCISE_BY_ID } from './exercises';
import type { MusicPool, ProgramExercise, Track, Vibe } from './types';

const HEAVY_PARTS = new Set(['chest', 'back', 'upper legs', 'shoulders']);

/** Sıradaki harekete uyan hava: büyük kas grupları güç ister, kardiyo tempo. Sıra bittiyse sakinleş. */
export function vibeFor(next: ProgramExercise | undefined): Vibe {
  if (!next) return 'calm';
  const part = EXERCISE_BY_ID.get(next.exerciseId)?.part;
  if (next.unit === 'min' || part === 'cardio') return 'cardio';
  return part && HEAVY_PARTS.has(part) ? 'power' : 'cardio';
}

export function pickSong(pool: MusicPool | undefined, vibe: Vibe, recent: string[]): Track | null {
  const list = pool?.vibes?.[vibe] ?? [];
  if (!list.length) return null;
  const fresh = list.filter((t) => !recent.includes(t.id));
  const from = fresh.length ? fresh : list;
  return from[Math.floor(Math.random() * from.length)];
}

export const spotifyWebUrl = (track: Track) => `https://open.spotify.com/track/${track.id}`;

/** Şarkıyı cihazdaki Spotify uygulamasında açar (spotify: bağlantısı). */
export function openInSpotify(track: Track) {
  window.location.href = `spotify:track:${track.id}`;
}
