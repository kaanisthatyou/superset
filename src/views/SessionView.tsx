import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Info, Lightbulb, Play, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Gif } from '../components/Gif';
import { Plate } from '../components/Plate';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/bits';
import { completeSet, nextExercise, undoSet } from '../lib/actions';
import { DAYS_LONG } from '../lib/dates';
import {
  dayProgress,
  doneSets,
  previousSets,
  placeDays,
  sessionVolume,
  suggestSet,
  targetNumber,
  useHistory,
  useMe,
  useProgram,
  useWeekLog,
} from '../lib/domain';
import { EXERCISE_BY_ID, exerciseName } from '../lib/exercises';
import { prime } from '../lib/feedback';
import { FEELS, unitShort } from '../lib/labels';
import { useApp } from '../lib/store';
import { syncNow } from '../lib/sync';
import type { ProgramDay, ProgramExercise, SessionLog, SetLog, WeekLog } from '../lib/types';
import { useUi } from '../lib/ui';

const fmtSet = (s: SetLog, exercise: ProgramExercise) =>
  exercise.unit === 'reps' ? (s.kg ? `${s.reps} × ${s.kg} kg` : `${s.reps} tekrar`) : `${s.reps} ${unitShort(exercise.unit)}`;

function ExerciseCard({
  day,
  exercise,
  index,
  session,
  history,
  open,
  onToggle,
  onDone,
}: {
  day: ProgramDay;
  exercise: ProgramExercise;
  index: number;
  session: SessionLog | undefined;
  history: WeekLog[];
  open: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const name = exerciseName(exercise.exerciseId, exercise.name);
  const info = EXERCISE_BY_ID.get(exercise.exerciseId);
  const sets = session?.exercises[exercise.exerciseId]?.sets ?? [];
  const done = doneSets(session, exercise.exerciseId).length;
  const complete = done >= exercise.sets;
  const previous = useMemo(() => previousSets(history, exercise.exerciseId, session), [history, exercise.exerciseId, session]);

  const firstOpen = Array.from({ length: exercise.sets }, (_, i) => i).find((i) => !sets[i]?.done) ?? -1;
  const [picked, setPicked] = useState<number | null>(null);
  const active = picked !== null && !sets[picked]?.done ? picked : firstOpen;

  const suggestion = suggestSet(exercise, Math.max(active, 0), session, previous);
  const [reps, setReps] = useState<number | undefined>(suggestion.reps);
  const [kg, setKg] = useState<number | undefined>(suggestion.kg);
  // Sıradaki sete geçince alanları yeni önerilerle doldur.
  useEffect(() => {
    setReps(suggestion.reps);
    setKg(suggestion.kg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, done]);

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  const finishSet = (value: number | undefined) => {
    if (active < 0) return;
    const willComplete = done + 1 >= exercise.sets;
    completeSet(day.id, exercise.exerciseId, active, { reps: value, kg: exercise.weighted ? kg : undefined });
    setPicked(null);
    if (willComplete) onDone();
  };

  // Süreli hareket (saniye ya da dakika): sayaç biter bitmez set kendiliğinden işaretlenir.
  const timed = exercise.unit !== 'reps';
  const workValue = reps ?? (exercise.unit === 'min' ? targetNumber(exercise.reps) || 10 : 30);
  const startWork = () => {
    prime();
    useApp.getState().startTimer({
      kind: 'work',
      total: exercise.unit === 'min' ? workValue * 60 : workValue,
      label: name,
      target: { dayId: day.id, exerciseId: exercise.exerciseId, setIdx: active, unit: exercise.unit },
    });
  };

  const kgStep = info?.equipment === 'dumbbell' || info?.equipment === 'kettlebell' ? 1 : 2.5;
  const target = `${exercise.sets} × ${exercise.reps}${exercise.unit === 'reps' ? '' : ` ${unitShort(exercise.unit)}`}`;

  return (
    <article ref={ref} className={`scroll-mt-4 scroll-mb-56 rounded-[26px] bg-paper ring-1 transition-shadow ${open ? 'ring-ink/80' : 'ring-line/70'}`}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        <span className={`num w-7 text-center text-2xl ${complete ? 'text-me' : 'text-mist'}`}>
          {complete ? <Check size={22} strokeWidth={3.5} className="mx-auto" /> : index + 1}
        </span>
        <Gif id={exercise.exerciseId} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-chalk/60" />
        <span className="min-w-0 flex-1">
          <span lang="en" className="block truncate font-semibold leading-snug">
            {name}
          </span>
          <span className="mt-0.5 block font-mono text-[0.7rem] text-steel">
            {target}
            {exercise.restSec > 0 && ` · ${exercise.restSec} sn ara`}
          </span>
          <span className="mt-1.5 flex gap-1">
            {Array.from({ length: exercise.sets }, (_, i) => (
              <span key={i} className={`h-1.5 w-5 rounded-full ${sets[i]?.done ? 'bg-me' : 'bg-line'}`} />
            ))}
          </span>
        </span>
        <ChevronDown size={20} className={`shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <button
                onClick={() => useUi.getState().open({ type: 'exercise', id: exercise.exerciseId, tip: exercise.tip })}
                className="relative mx-auto block w-full max-w-[13.5rem]"
                aria-label={`${name}: nasıl yapılır`}
              >
                <Gif id={exercise.exerciseId} alt={name} lazy={false} className="aspect-square w-full" />
                <span className="eyebrow absolute -right-14 bottom-1 flex items-center gap-1 rounded-full bg-chalk px-2.5 py-1.5 text-steel">
                  <Info size={12} /> Nasıl yapılır
                </span>
              </button>

              {exercise.tip && (
                <p className="mt-2 flex gap-2.5 rounded-2xl bg-chalk p-3 text-[0.9rem] leading-snug">
                  <Lightbulb size={17} className="mt-0.5 shrink-0 text-me" />
                  <span>{exercise.tip}</span>
                </p>
              )}

              {/* Setler: her biri bir plaka. Dolu plakaya dokununca geri alınır. */}
              <div className="mt-4 flex flex-wrap items-start gap-2.5">
                {Array.from({ length: exercise.sets }, (_, i) => {
                  const s = sets[i];
                  const isActive = i === active;
                  return (
                    <button
                      key={i}
                      onClick={() => (s?.done ? undoSet(day.id, exercise.exerciseId, i) : setPicked(i))}
                      aria-label={s?.done ? `Set ${i + 1} tamam: ${fmtSet(s, exercise)}. Geri almak için dokun.` : `Set ${i + 1}`}
                      className="active:scale-95"
                    >
                      <motion.span
                        key={s?.done ? 'done' : 'open'}
                        initial={s?.done ? { scale: 0.7, rotate: -40 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                        className="block"
                      >
                        <Plate size={66} fill={s?.done ? 1 : 0} active={isActive}>
                          {s?.done ? (
                            <span className="flex flex-col items-center">
                              <span className="num text-[1.35rem]">{s.reps ?? <Check size={20} strokeWidth={3.5} />}</span>
                              <span className="font-mono text-[0.55rem] font-medium opacity-90">
                                {exercise.unit !== 'reps' ? unitShort(exercise.unit) : s.kg ? `${s.kg} kg` : 'tekrar'}
                              </span>
                            </span>
                          ) : (
                            <span className={`num text-xl ${isActive ? 'text-ink' : 'text-mist'}`}>{i + 1}</span>
                          )}
                        </Plate>
                      </motion.span>
                    </button>
                  );
                })}
                {previous.length > 0 && (
                  <p className="ml-auto self-center text-right font-mono text-[0.65rem] leading-relaxed text-steel">
                    GEÇEN SEFER
                    <br />
                    <span className="text-ink">{fmtSet(previous[Math.max(active, 0)] ?? previous[previous.length - 1], exercise)}</span>
                  </p>
                )}
              </div>

              {active >= 0 && (
                <div className="mt-4">
                  <div className="flex gap-2.5">
                    {exercise.weighted && <Stepper label="Ağırlık · kg" value={kg} onChange={setKg} step={kgStep} />}
                    <Stepper
                      label={exercise.unit === 'reps' ? 'Tekrar' : exercise.unit === 'sec' ? 'Süre · sn' : 'Süre · dk'}
                      value={reps}
                      onChange={setReps}
                      step={exercise.unit === 'sec' ? 5 : 1}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    {timed && (
                      <button
                        onClick={startWork}
                        className="flex h-16 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-chalk active:scale-[0.98]"
                      >
                        <Play size={18} fill="currentColor" />
                        <span className="display text-2xl">
                          {workValue} {unitShort(exercise.unit)} başlat
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => finishSet(reps)}
                      className={`flex h-16 items-center justify-center gap-2 rounded-full bg-me text-on-me active:scale-[0.98] ${
                        timed ? 'px-6' : 'flex-1'
                      }`}
                    >
                      <Check size={22} strokeWidth={3.5} />
                      <span className="display text-2xl">
                        {timed ? 'Yaptım' : exercise.sets > 1 ? `Set ${active + 1} tamam` : 'Tamam'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function Finish({ session, onSave }: { session: SessionLog; onSave: (feel: number | undefined, note: string) => void }) {
  const [feel, setFeel] = useState<number | undefined>(session.feel);
  const [note, setNote] = useState(session.note ?? '');
  const { sets, volume } = sessionVolume(session);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-ink p-6 text-chalk"
    >
      <p className="eyebrow text-mist">Bütün setler tamam</p>
      <p className="display mt-2 text-5xl">Eline sağlık</p>
      <p className="mt-3 font-mono text-xs text-mist">
        {sets} SET{volume > 0 && ` · ${Math.round(volume).toLocaleString('tr')} KG TOPLAM YÜK`}
      </p>
      <p className="mt-6 text-sm font-medium">Nasıldı?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FEELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setFeel(i + 1)}
            aria-pressed={feel === i + 1}
            className={`h-11 rounded-full px-3.5 text-sm font-medium ${
              feel === i + 1 ? 'bg-me text-on-me' : 'bg-chalk/10 text-chalk'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Koça not: ağrıyan bir yer, çok hafif gelen bir hareket…"
        rows={2}
        className="mt-3 w-full resize-none rounded-2xl bg-chalk/10 p-3 text-[0.95rem] outline-none placeholder:text-mist focus:ring-2 focus:ring-chalk/50"
      />
      <button
        onClick={() => onSave(feel, note)}
        className="display mt-4 h-16 w-full rounded-full bg-chalk text-2xl text-ink active:scale-[0.98]"
      >
        Antrenmanı kaydet
      </button>
    </motion.section>
  );
}

export function SessionView({ dayId }: { dayId: string }) {
  const me = useMe()!;
  const program = useProgram(me.id)?.program;
  const day = program?.days.find((d) => d.id === dayId);
  const log = useWeekLog(me.id);
  const history = useHistory(me.id);
  const session = log?.sessions[dayId];
  const keepAwake = useApp((s) => s.settings.keepAwake);
  const [openId, setOpenId] = useState<string | null>(() => nextExercise(dayId)?.exerciseId ?? null);

  // Antrenman sırasında ekran kararmasın.
  useEffect(() => {
    if (!keepAwake || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock.request('screen').then((l) => (lock = l), () => undefined);
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, [keepAwake]);

  if (!day || !program) return null;
  const p = dayProgress(day, session);
  const allDone = p.done >= p.total;

  const save = (feel: number | undefined, note: string) => {
    useApp.getState().patchSession(dayId, { finishedAt: new Date().toISOString(), feel, note: note.trim() || undefined });
    useApp.getState().clearTimer();
    useUi.getState().setSong(null);
    useUi.getState().close();
    useUi.getState().showToast('Antrenman kaydedildi');
    void syncNow();
  };

  return (
    <Sheet
      full
      eyebrow={`${DAYS_LONG[placeDays(program, log).get(day.id)! - 1] ?? 'Gelecek hafta'} · ${p.done}/${p.total} set`}
      title={day.title}
      footer={
        <div className="h-1.5 bg-line" aria-hidden="true">
          <div className="h-full bg-me transition-[width] duration-500" style={{ width: `${(p.done / p.total) * 100}%` }} />
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 px-3 pb-56">
        {day.together && (
          <p className="flex items-center gap-2 px-2 text-sm font-medium">
            <Users size={16} /> Bugün ikiniz birlikte.
          </p>
        )}
        {day.warmup && (
          <p className="rounded-2xl px-2 text-sm leading-snug text-steel">
            <span className="eyebrow mr-2 text-ink">Isınma</span>
            {day.warmup}
          </p>
        )}

        {day.exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.exerciseId}
            day={day}
            exercise={exercise}
            index={i}
            session={session}
            history={history}
            open={openId === exercise.exerciseId}
            onToggle={() => setOpenId((id) => (id === exercise.exerciseId ? null : exercise.exerciseId))}
            onDone={() => setOpenId(nextExercise(dayId, exercise.exerciseId)?.exerciseId ?? null)}
          />
        ))}

        {day.cooldown && (
          <p className="rounded-2xl px-2 pt-1 text-sm leading-snug text-steel">
            <span className="eyebrow mr-2 text-ink">Soğuma</span>
            {day.cooldown}
          </p>
        )}

        {session && allDone && !session.finishedAt && <Finish session={session} onSave={save} />}
        {session?.finishedAt && (
          <p className="rounded-[24px] bg-ink p-5 text-chalk">
            <span className="display block text-3xl">Kaydedildi</span>
            <span className="mt-1 block text-sm text-mist">
              {session.feel ? `${FEELS[session.feel - 1]}. ` : ''}
              {session.note ?? ''}
            </span>
          </p>
        )}
        {session && p.started && !allDone && !session.finishedAt && (
          <button
            onClick={() => save(undefined, '')}
            className="mt-2 h-12 rounded-full text-sm font-medium text-steel ring-1 ring-line"
          >
            Burada bitir ve kaydet
          </button>
        )}
      </div>
    </Sheet>
  );
}
