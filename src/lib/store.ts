import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mondayOf, today } from './dates';
import { exerciseName } from './exercises';
import type { GhConfig } from './github';
import type {
  BodyEntry,
  BodyLog,
  Profile,
  Program,
  ProgramDay,
  ProgramExercise,
  SessionLog,
  SetLog,
  WeekLog,
} from './types';

// seed/ klasörü hem özel deponun ilk içeriği hem de depo bağlanmadan önceki yerel başlangıç verisi.
const seedModules = import.meta.glob('../../seed/**/*.json', { eager: true, import: 'default' });
export const SEED: Record<string, unknown> = {};
for (const [key, value] of Object.entries(seedModules)) SEED[key.slice(key.indexOf('/seed/') + 6)] = value;

export interface Settings {
  music: boolean;
  sound: boolean;
  vibrate: boolean;
  keepAwake: boolean;
}

export interface FileEntry {
  /** GitHub'daki blob sha'sı; yoksa dosya henüz gönderilmedi. */
  sha?: string;
  data: unknown;
}

export interface Timer {
  kind: 'rest' | 'work';
  endsAt: number;
  total: number;
  label: string;
  /** Süre tutulan set bitince işaretlensin diye. */
  target?: { dayId: string; exerciseId: string; setIdx: number };
}

export interface AppState {
  /** Bu cihazı kullanan kişi. */
  me: string | null;
  gh: GhConfig | null;
  /** Depodan en az bir kez veri çekildi mi? */
  synced: boolean;
  settings: Settings;
  /** Depo yolu → dosya. Programlar, kayıtlar, profiller: hepsi burada. */
  files: Record<string, FileEntry>;
  /** Gönderilmeyi bekleyen yollar. */
  dirty: Record<string, true>;
  timer: Timer | null;
  recentSongs: string[];

  setMe: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  connect: (cfg: GhConfig | null) => void;
  writeFile: (path: string, data: unknown) => void;
  logSet: (args: {
    program: Program;
    day: ProgramDay;
    exercise: ProgramExercise;
    setIdx: number;
    patch: Partial<SetLog>;
  }) => void;
  patchSession: (dayId: string, patch: Partial<SessionLog>) => void;
  addBody: (entry: Omit<BodyEntry, 'at'>) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  startTimer: (timer: Omit<Timer, 'endsAt'>) => void;
  adjustTimer: (deltaSec: number) => void;
  clearTimer: () => void;
  noteSong: (id: string) => void;
}

const SINGLETONS = ['profiles.json', 'music.json'];

type Readable = Pick<AppState, 'files' | 'synced'>;

export function readFile<T>(s: Readable, path: string): T | undefined {
  const file = s.files[path];
  if (file) return file.data as T;
  if (!s.synced || SINGLETONS.includes(path)) return SEED[path] as T | undefined;
  return undefined;
}

export function listPaths(s: Readable, prefix: string): string[] {
  const paths = new Set(Object.keys(s.files).filter((p) => p.startsWith(prefix)));
  if (!s.synced) for (const p of Object.keys(SEED)) if (p.startsWith(prefix)) paths.add(p);
  return [...paths].sort();
}

export const logPath = (profile: string, week: string) => `logs/${profile}/${week}.json`;
export const bodyPath = (profile: string) => `body/${profile}.json`;
export const PROFILES_PATH = 'profiles.json';
export const MUSIC_PATH = 'music.json';

const write = (s: AppState, path: string, data: unknown): Pick<AppState, 'files' | 'dirty'> => ({
  files: { ...s.files, [path]: { sha: s.files[path]?.sha, data } },
  dirty: { ...s.dirty, [path]: true },
});

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      me: null,
      gh: null,
      synced: false,
      settings: { music: true, sound: true, vibrate: true, keepAwake: true },
      files: {},
      dirty: {},
      timer: null,
      recentSongs: [],

      setMe: (id) => set({ me: id }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      connect: (cfg) => set({ gh: cfg, synced: false }),
      writeFile: (path, data) => set((s) => write(s, path, data)),

      logSet: ({ program, day, exercise, setIdx, patch }) =>
        set((s) => {
          if (!s.me) return s;
          const date = today();
          const week = mondayOf(date);
          const path = logPath(s.me, week);
          const now = new Date().toISOString();
          const prev = readFile<WeekLog>(s, path);
          const log: WeekLog = prev
            ? structuredClone(prev)
            : { profile: s.me, week, updatedAt: now, sessions: {} };
          const session = (log.sessions[day.id] ??= {
            dayId: day.id,
            programId: program.id,
            title: day.title,
            date,
            startedAt: now,
            updatedAt: now,
            exercises: {},
          });
          const entry = (session.exercises[exercise.exerciseId] ??= {
            exerciseId: exercise.exerciseId,
            name: exerciseName(exercise.exerciseId, exercise.name),
            unit: exercise.unit,
            sets: [],
          });
          while (entry.sets.length <= setIdx) entry.sets.push({ done: false, at: '' });
          entry.sets[setIdx] = { ...entry.sets[setIdx], ...patch, at: now };
          session.updatedAt = log.updatedAt = now;
          return write(s, path, log);
        }),

      patchSession: (dayId, patch) =>
        set((s) => {
          if (!s.me) return s;
          const path = logPath(s.me, mondayOf(today()));
          const prev = readFile<WeekLog>(s, path);
          if (!prev?.sessions[dayId]) return s;
          const now = new Date().toISOString();
          const log = structuredClone(prev);
          log.sessions[dayId] = { ...log.sessions[dayId], ...patch, updatedAt: now };
          log.updatedAt = now;
          return write(s, path, log);
        }),

      addBody: (entry) =>
        set((s) => {
          if (!s.me) return s;
          const path = bodyPath(s.me);
          const prev = readFile<BodyLog>(s, path) ?? { profile: s.me, entries: [] };
          const entries = prev.entries
            .filter((e) => e.date !== entry.date)
            .concat({ ...entry, at: new Date().toISOString() })
            .sort((a, b) => a.date.localeCompare(b.date));
          return write(s, path, { ...prev, entries });
        }),

      updateProfile: (id, patch) =>
        set((s) => {
          const prev = readFile<{ profiles: Profile[] }>(s, PROFILES_PATH) ?? { profiles: [] };
          const profiles = prev.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
          return write(s, PROFILES_PATH, { ...prev, profiles });
        }),

      startTimer: (timer) => set({ timer: { ...timer, endsAt: Date.now() + timer.total * 1000 } }),
      adjustTimer: (deltaSec) =>
        set((s) =>
          s.timer
            ? {
                timer: {
                  ...s.timer,
                  endsAt: Math.max(Date.now(), s.timer.endsAt + deltaSec * 1000),
                  total: Math.max(1, s.timer.total + deltaSec),
                },
              }
            : s,
        ),
      clearTimer: () => set({ timer: null }),
      noteSong: (id) => set((s) => ({ recentSongs: [id, ...s.recentSongs.filter((x) => x !== id)].slice(0, 30) })),
    }),
    { name: 'superset', version: 1 },
  ),
);
