import { useMemo } from 'react';
import { addDays, mondayOf, today, weekdayOf } from './dates';
import { bodyPath, listPaths, logPath, MUSIC_PATH, PROFILES_PATH, readFile, useApp, type AppState } from './store';
import type {
  BodyLog,
  MusicPool,
  Profile,
  Program,
  ProgramDay,
  ProgramExercise,
  SessionLog,
  SetLog,
  WeekLog,
} from './types';

type Readable = Pick<AppState, 'files' | 'synced'>;

const useReadable = (): Readable => {
  const files = useApp((s) => s.files);
  const synced = useApp((s) => s.synced);
  return useMemo(() => ({ files, synced }), [files, synced]);
};

// ── Profiller ──────────────────────────────────────────────────────────────

export function useProfiles(): Profile[] {
  const r = useReadable();
  return useMemo(() => readFile<{ profiles: Profile[] }>(r, PROFILES_PATH)?.profiles ?? [], [r]);
}

export function useMe(): Profile | undefined {
  const me = useApp((s) => s.me);
  return useProfiles().find((p) => p.id === me);
}

export function usePartner(): Profile | undefined {
  const me = useApp((s) => s.me);
  return useProfiles().find((p) => p.id !== me);
}

// ── Programlar ─────────────────────────────────────────────────────────────

export function programsOf(r: Readable, profile: string): Program[] {
  return listPaths(r, `programs/${profile}/`)
    .map((p) => readFile<Program>(r, p))
    .filter((p): p is Program => !!p?.days)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Bugün geçerli program: başlamış olanların en yenisi. Süresi dolduysa aynı program tekrar edilir. */
export function pickProgram(programs: Program[], date: string) {
  const started = programs.filter((p) => p.startDate <= date);
  const program = started.at(-1) ?? programs[0];
  if (!program) return null;
  return { program, expired: date > program.endDate, upcoming: program.startDate > date };
}

export function useProgram(profile: string | null | undefined) {
  const r = useReadable();
  return useMemo(() => (profile ? pickProgram(programsOf(r, profile), today()) : null), [r, profile]);
}

// ── Kayıtlar ───────────────────────────────────────────────────────────────

export function useWeekLog(profile: string | null | undefined, week = mondayOf(today())): WeekLog | undefined {
  const r = useReadable();
  return useMemo(() => (profile ? readFile<WeekLog>(r, logPath(profile, week)) : undefined), [r, profile, week]);
}

/** Bir kişinin tüm haftaları, eskiden yeniye. */
export function useHistory(profile: string | null | undefined): WeekLog[] {
  const r = useReadable();
  return useMemo(
    () =>
      profile
        ? listPaths(r, `logs/${profile}/`)
            .map((p) => readFile<WeekLog>(r, p))
            .filter((l): l is WeekLog => !!l?.sessions)
            .sort((a, b) => a.week.localeCompare(b.week))
        : [],
    [r, profile],
  );
}

export function useBody(profile: string | null | undefined): BodyLog | undefined {
  const r = useReadable();
  return useMemo(() => (profile ? readFile<BodyLog>(r, bodyPath(profile)) : undefined), [r, profile]);
}

export function useMusic(): MusicPool | undefined {
  const r = useReadable();
  return useMemo(() => readFile<MusicPool>(r, MUSIC_PATH), [r]);
}

// ── Hesaplar ───────────────────────────────────────────────────────────────

export const doneSets = (session: SessionLog | undefined, exerciseId: string): SetLog[] =>
  session?.exercises[exerciseId]?.sets.filter((s) => s.done) ?? [];

export function dayProgress(day: ProgramDay, session: SessionLog | undefined) {
  const total = day.exercises.reduce((n, e) => n + e.sets, 0);
  const done = day.exercises.reduce((n, e) => n + Math.min(e.sets, doneSets(session, e.exerciseId).length), 0);
  return { done, total, started: done > 0, complete: done >= total || !!session?.finishedAt };
}

/** "10-12" → 10, "30" → 30, "10 / taraf" → 10 */
export const targetNumber = (reps: string) => Number(reps.match(/\d+/)?.[0] ?? 0);

/** kg × tekrar toplamı (yalnızca ağırlıklı, tekrar sayılan setler). */
export function sessionVolume(session: SessionLog) {
  let volume = 0;
  let sets = 0;
  for (const e of Object.values(session.exercises)) {
    for (const s of e.sets) {
      if (!s.done) continue;
      sets++;
      if (e.unit === 'reps' && s.kg && s.reps) volume += s.kg * s.reps;
    }
  }
  return { volume, sets };
}

export interface ExercisePoint {
  date: string;
  /** O günün en ağır seti */
  kg: number;
  reps: number;
  volume: number;
}

/** Bir hareketin gün gün geçmişi (yalnızca kg girilen setler). */
export function exerciseHistory(history: WeekLog[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const week of history) {
    for (const session of Object.values(week.sessions)) {
      const sets = doneSets(session, exerciseId).filter((s) => s.kg && s.reps);
      if (!sets.length) continue;
      const top = sets.reduce((a, b) => (b.kg! > a.kg! || (b.kg === a.kg && b.reps! > a.reps!) ? b : a));
      points.push({
        date: session.date,
        kg: top.kg!,
        reps: top.reps!,
        volume: sets.reduce((n, s) => n + s.kg! * s.reps!, 0),
      });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Bu hareketin, verilen oturumdan önceki en son yapılışındaki setler. */
export function previousSets(history: WeekLog[], exerciseId: string, except?: SessionLog): SetLog[] {
  let best: { date: string; sets: SetLog[] } | null = null;
  for (const week of history) {
    for (const session of Object.values(week.sessions)) {
      if (session === except || (except && session.dayId === except.dayId && session.date === except.date)) continue;
      const sets = doneSets(session, exerciseId);
      if (sets.length && (!best || session.date > best.date)) best = { date: session.date, sets };
    }
  }
  return best?.sets ?? [];
}

/** Sıradaki set için başlangıç değerleri: bu oturumdaki önceki set → geçen sefer → programın önerisi. */
export function suggestSet(
  exercise: ProgramExercise,
  setIdx: number,
  session: SessionLog | undefined,
  previous: SetLog[],
): { reps: number; kg: number | undefined } {
  const mine = session?.exercises[exercise.exerciseId]?.sets ?? [];
  const sameSession = mine.slice(0, setIdx).reverse().find((s) => s.done);
  const lastTime = previous[setIdx] ?? previous.at(-1);
  const logged = mine[setIdx]?.reps !== undefined ? mine[setIdx] : undefined;
  return {
    reps: logged?.reps ?? (exercise.unit === 'reps' ? (sameSession?.reps ?? lastTime?.reps) : undefined) ?? targetNumber(exercise.reps),
    kg: exercise.weighted ? (logged?.kg ?? sameSession?.kg ?? lastTime?.kg ?? exercise.startKg) : undefined,
  };
}

/** Haftanın günlerine göre plan: 1..7 → o güne önerilen antrenman. */
export function daysByWeekday(program: Program | undefined) {
  const map = new Map<number, ProgramDay>();
  for (const d of program?.days ?? []) if (!map.has(d.weekday)) map.set(d.weekday, d);
  return map;
}

/** Bugün yapılacak gün: bugüne planlanan; yoksa/bittiyse sıradaki bitmemiş gün. */
export function pickToday(program: Program, log: WeekLog | undefined) {
  const wd = weekdayOf(today());
  const planned = program.days.find((d) => d.weekday === wd);
  const open = (d: ProgramDay) => !dayProgress(d, log?.sessions[d.id]).complete;
  if (planned && open(planned)) return { day: planned, kind: 'today' as const };
  const inProgress = program.days.find((d) => open(d) && dayProgress(d, log?.sessions[d.id]).started);
  if (inProgress) return { day: inProgress, kind: 'resume' as const };
  if (planned) return { day: planned, kind: 'done' as const };
  const missed = program.days.find((d) => d.weekday < wd && open(d));
  if (missed) return { day: missed, kind: 'missed' as const };
  const next = program.days.find((d) => d.weekday > wd && open(d));
  return next ? { day: next, kind: 'rest' as const } : { day: null, kind: 'weekDone' as const };
}

export const weekDates = (week: string) => Array.from({ length: 7 }, (_, i) => addDays(week, i));
