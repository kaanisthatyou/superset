import { mondayOf, today } from './dates';
import { dayProgress, doneSets, pickProgram, programsOf } from './domain';
import { exerciseName } from './exercises';
import { prime, tick } from './feedback';
import { pickSong, vibeFor } from './music';
import { logPath, MUSIC_PATH, readFile, useApp } from './store';
import type { MusicPool, ProgramExercise, WeekLog } from './types';
import { useUi } from './ui';

function locate(dayId: string) {
  const s = useApp.getState();
  if (!s.me) return null;
  const program = pickProgram(programsOf(s, s.me), today())?.program;
  const day = program?.days.find((d) => d.id === dayId);
  return program && day ? { program, day } : null;
}

const currentSession = (dayId: string) => {
  const s = useApp.getState();
  return s.me ? readFile<WeekLog>(s, logPath(s.me, mondayOf(today())))?.sessions[dayId] : undefined;
};

/** Bir seti tamamlar: kaydeder, dinlenme süresini başlatır, hareket bittiyse şarkı önerir. */
export function completeSet(dayId: string, exerciseId: string, setIdx: number, values: { reps?: number; kg?: number }) {
  const found = locate(dayId);
  const exercise = found?.day.exercises.find((e) => e.exerciseId === exerciseId);
  if (!found || !exercise) return;
  const { program, day } = found;
  const app = useApp.getState();

  prime();
  tick();
  app.logSet({ program, day, exercise, setIdx, patch: { ...values, done: true } });

  const session = currentSession(dayId);
  const exerciseDone = doneSets(session, exerciseId).length >= exercise.sets;
  const dayDone = dayProgress(day, session).done >= dayProgress(day, session).total;
  const next = nextExercise(dayId);

  if (dayDone) {
    app.clearTimer();
  } else if (exercise.restSec > 0) {
    app.startTimer({
      kind: 'rest',
      total: exercise.restSec,
      label: exerciseDone && next ? `Sıradaki: ${exerciseName(next.exerciseId, next.name)}` : `Sıradaki: set ${setIdx + 2} / ${exercise.sets}`,
    });
  } else {
    app.clearTimer();
  }

  if (exerciseDone && app.settings.music) suggestSong(dayDone ? undefined : next);
}

export function undoSet(dayId: string, exerciseId: string, setIdx: number) {
  const found = locate(dayId);
  const exercise = found?.day.exercises.find((e) => e.exerciseId === exerciseId);
  if (!found || !exercise) return;
  useApp.getState().logSet({ ...found, exercise, setIdx, patch: { done: false } });
}

/** Sıradaki bitmemiş hareket (önce listede sonra gelenler, sonra başa dönerek). */
export function nextExercise(dayId: string, afterId?: string): ProgramExercise | undefined {
  const found = locate(dayId);
  if (!found) return undefined;
  const session = currentSession(dayId);
  const open = (e: ProgramExercise) => doneSets(session, e.exerciseId).length < e.sets;
  const list = found.day.exercises;
  const from = afterId ? list.findIndex((e) => e.exerciseId === afterId) + 1 : 0;
  return list.slice(from).find(open) ?? list.find(open);
}

/** "Bunu dinlemek ister misin?" — yalnızca öneri; şarkı ancak kullanıcı onaylarsa açılır. */
export function suggestSong(next: ProgramExercise | undefined) {
  const app = useApp.getState();
  const vibe = vibeFor(next);
  const track = next?.song ?? pickSong(readFile<MusicPool>(app, MUSIC_PATH), vibe, app.recentSongs);
  if (!track) return;
  app.noteSong(track.id);
  useUi.getState().setSong({
    track,
    vibe,
    reason: next ? `${exerciseName(next.exerciseId, next.name)} için` : 'Soğuma için',
  });
}

/** Aynı havada başka bir şarkı öner. */
export function rerollSong() {
  const current = useUi.getState().song;
  if (!current) return;
  const app = useApp.getState();
  const track = pickSong(readFile<MusicPool>(app, MUSIC_PATH), current.vibe, app.recentSongs);
  if (!track) return;
  app.noteSong(track.id);
  useUi.getState().setSong({ ...current, track });
}
