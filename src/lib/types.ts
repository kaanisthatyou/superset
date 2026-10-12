export type PlateColor = 'red' | 'blue' | 'yellow' | 'green';

export interface Profile {
  id: string;
  name: string;
  color: PlateColor;
  /** Koçun (Claude) program yazarken kullandığı bilgiler; uygulama sadece gösterir. */
  goal?: string;
  [extra: string]: unknown;
}

export type Unit = 'reps' | 'sec' | 'min';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover?: string;
}

export type Vibe = 'power' | 'cardio' | 'calm';

export interface MusicPool {
  vibes: Record<Vibe, Track[]>;
}

export interface ProgramExercise {
  exerciseId: string;
  /** Veritabanındaki adın yerine gösterilecek ad (isteğe bağlı). */
  name?: string;
  sets: number;
  /** Hedef, gösterildiği gibi: "10-12", "30", "10 / taraf". */
  reps: string;
  unit: Unit;
  restSec: number;
  /** kg girilsin mi? */
  weighted: boolean;
  startKg?: number;
  tip?: string;
  /** Koç bu harekete özel şarkı seçtiyse. */
  song?: Track;
}

export interface ProgramDay {
  id: string;
  /** Önerilen gün: 1 = Pazartesi … 7 = Pazar */
  weekday: number;
  title: string;
  subtitle?: string;
  minutes?: number;
  warmup?: string;
  cooldown?: string;
  /** İkisinin birlikte yaptığı gün. */
  together?: boolean;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  profile: string;
  title: string;
  startDate: string;
  endDate: string;
  /** Bu haftanın planı neden böyle. */
  coachNote?: string;
  /** Geçen haftanın değerlendirmesi. */
  review?: string;
  days: ProgramDay[];
}

export interface SetLog {
  /** Tekrar sayısı ya da süre (hareketin birimine göre). */
  reps?: number;
  kg?: number;
  done: boolean;
  at: string;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string;
  unit: Unit;
  sets: SetLog[];
}

export interface SessionLog {
  dayId: string;
  programId: string;
  title: string;
  date: string;
  startedAt?: string;
  finishedAt?: string;
  /** 1 çok kolay … 5 çok zor */
  feel?: number;
  note?: string;
  updatedAt: string;
  exercises: Record<string, ExerciseLog>;
}

export interface WeekLog {
  profile: string;
  /** Haftanın pazartesi tarihi */
  week: string;
  updatedAt: string;
  sessions: Record<string, SessionLog>;
}

export interface BodyEntry {
  date: string;
  kg?: number;
  waistCm?: number;
  at: string;
}

export interface BodyLog {
  profile: string;
  entries: BodyEntry[];
}

export interface Exercise {
  id: string;
  name: string;
  part: string;
  target: string;
  secondary: string[];
  equipment: string;
}
