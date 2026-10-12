import data from '../data/exercises.json';
import type { Exercise } from './types';

export const EXERCISES = data as Exercise[];
export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export const gifUrl = (id: string) => `https://static.exercisedb.dev/media/${id}.gif`;

let instructions: Promise<Record<string, string[]>> | null = null;
/** Adım adım anlatımlar büyük bir dosya; ilk detay açıldığında yüklenir. */
export const loadInstructions = () =>
  (instructions ??= import('../data/instructions.json').then((m) => m.default as Record<string, string[]>));

/** "sled 45° leg press" → "Sled 45° Leg Press" */
export const titleCase = (s: string) => s.replace(/(^|[\s(-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

export const exerciseName = (id: string, override?: string) =>
  override ?? titleCase(EXERCISE_BY_ID.get(id)?.name ?? id);
