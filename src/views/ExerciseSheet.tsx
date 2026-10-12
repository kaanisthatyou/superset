import { Lightbulb } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BodyMap } from '../components/BodyMap';
import { Gif } from '../components/Gif';
import { Sheet } from '../components/Sheet';
import { Sparkline } from '../components/bits';
import { fmtDay } from '../lib/dates';
import { exerciseHistory, useHistory, useMe, useProgram } from '../lib/domain';
import { EXERCISE_BY_ID, loadInstructions, titleCase } from '../lib/exercises';
import { equipmentLabel, MUSCLE_TO_MAP, muscleLabel, partLabel } from '../lib/labels';

export function ExerciseSheet({ id, tip }: { id: string; tip?: string }) {
  const exercise = EXERCISE_BY_ID.get(id);
  const me = useMe();
  const program = useProgram(me?.id)?.program;
  const history = useHistory(me?.id);
  const [steps, setSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadInstructions().then((all) => alive && setSteps(all[id] ?? []));
    return () => {
      alive = false;
    };
  }, [id]);

  const points = useMemo(() => exerciseHistory(history, id), [history, id]);
  // Dizinden açıldıysa ve hareket bu haftanın programındaysa koçun ipucunu yine göster.
  const myTip = tip ?? program?.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === id)?.tip;

  if (!exercise) return null;
  const name = titleCase(exercise.name);

  return (
    <Sheet title={name} eyebrow={`${partLabel(exercise.part)} · ${equipmentLabel(exercise.equipment)}`}>
      <div className="px-5 pb-10" lang="tr">
        <Gif id={id} alt={name} lazy={false} className="mx-auto aspect-square w-full max-w-[16rem]" />

        {myTip && (
          <p className="mt-2 flex gap-2.5 rounded-2xl bg-paper p-3.5 leading-snug ring-1 ring-line/70">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-me" />
            <span>
              <span className="eyebrow mb-1 block text-steel">Koçun {me?.name} için ipucu</span>
              {myTip}
            </span>
          </p>
        )}

        <div className="mt-5 flex items-center gap-5 rounded-[24px] bg-paper p-4 ring-1 ring-line/70">
          <BodyMap
            primary={MUSCLE_TO_MAP[exercise.target] ?? []}
            secondary={exercise.secondary.flatMap((m) => MUSCLE_TO_MAP[m.toLowerCase()] ?? [])}
            className="h-36 w-32 shrink-0 [&_figcaption]:hidden"
          />
          <dl className="min-w-0 flex-1 text-sm">
            <dt className="eyebrow text-steel">Ana kas</dt>
            <dd className="display mt-0.5 text-[1.7rem] text-me">{muscleLabel(exercise.target)}</dd>
            {exercise.secondary.length > 0 && (
              <>
                <dt className="eyebrow mt-3 text-steel">Yardımcı kaslar</dt>
                <dd className="mt-0.5 font-medium">{exercise.secondary.map(muscleLabel).join(', ')}</dd>
              </>
            )}
          </dl>
        </div>

        {points.length > 0 && (
          <section className="mt-6">
            <h3 className="display text-2xl">Senin kayıtların</h3>
            <div className="mt-2 flex items-center gap-4 rounded-[24px] bg-paper p-4 ring-1 ring-line/70">
              <div className="min-w-0 flex-1">
                {points
                  .slice(-4)
                  .reverse()
                  .map((p) => (
                    <p key={p.date} className="flex justify-between gap-3 py-0.5 font-mono text-xs">
                      <span className="text-steel">{fmtDay(p.date)}</span>
                      <span>
                        {p.reps} × {p.kg} kg
                      </span>
                    </p>
                  ))}
              </div>
              <Sparkline values={points.map((p) => p.kg)} />
            </div>
          </section>
        )}

        <section className="mt-6">
          <h3 className="display text-2xl">Adım adım</h3>
          {steps === null ? (
            <p className="mt-2 text-steel">Yükleniyor…</p>
          ) : steps.length === 0 ? (
            <p className="mt-2 text-steel">Bu hareket için yazılı anlatım yok; animasyonu izle.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3" lang="en">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3.5 leading-snug">
                  <span className="num w-5 shrink-0 pt-0.5 text-xl text-mist">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="eyebrow mt-5 text-mist">Animasyon ve anlatım: ExerciseDB</p>
        </section>
      </div>
    </Sheet>
  );
}
