import { motion } from 'motion/react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { BodyMap } from '../components/BodyMap';
import { Gif } from '../components/Gif';
import { EXERCISES, titleCase } from '../lib/exercises';
import { equipmentLabel, MAP_TO_FILTER, MUSCLE_TO_MAP, muscleLabel, partLabel, PARTS } from '../lib/labels';
import type { Exercise } from '../lib/types';
import { useUi } from '../lib/ui';

const COUNT_BY_PART = EXERCISES.reduce<Record<string, number>>((m, e) => {
  m[e.part] = (m[e.part] ?? 0) + 1;
  return m;
}, {});

/** Her bölgeyi temsil eden bir hareket (kutucuktaki animasyon). */
const COVER: Record<string, string> = {
  chest: 'SpYC0Kp',
  back: 'qdRxqCj',
  shoulders: 'znQUdHY',
  'upper arms': 'NbVPDMW',
  'lower arms': EXERCISES.find((e) => e.part === 'lower arms')!.id,
  waist: 'XVDdcoj',
  'upper legs': 'yn8yg1r',
  'lower legs': EXERCISES.find((e) => e.part === 'lower legs')!.id,
  cardio: 'rjiM4L3',
  neck: EXERCISES.find((e) => e.part === 'neck')!.id,
};

const PAGE = 40;

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <button
      onClick={() => useUi.getState().open({ type: 'exercise', id: exercise.id })}
      className="group flex flex-col rounded-[22px] bg-paper p-2.5 text-left ring-1 ring-line/70 active:scale-[0.98]"
    >
      <Gif id={exercise.id} alt="" className="aspect-square w-full" />
      <span lang="en" className="mt-1 line-clamp-2 min-h-[2.4em] px-1 text-[0.85rem] leading-tight font-semibold">
        {titleCase(exercise.name)}
      </span>
      <span className="eyebrow mt-1.5 px-1 pb-1 text-steel">{equipmentLabel(exercise.equipment)}</span>
    </button>
  );
}

function Group({ title, items }: { title: string; items: Exercise[] }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <section className="mt-7">
      <h2 className="flex items-baseline gap-2.5">
        <span className="display text-[1.9rem]">{title}</span>
        <span className="font-mono text-xs text-steel">{items.length}</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.slice(0, shown).map((e) => (
          <ExerciseCard key={e.id} exercise={e} />
        ))}
      </div>
      {items.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-3 h-12 w-full rounded-full text-sm font-medium ring-1 ring-line"
        >
          {Math.min(PAGE, items.length - shown)} hareket daha göster
        </button>
      )}
    </section>
  );
}

export function IndexView() {
  const { part, target } = useUi((s) => s.filter);
  const setFilter = useUi((s) => s.setFilter);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<string | null>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  const inPart = useMemo(() => (part ? EXERCISES.filter((e) => e.part === part) : []), [part]);
  const targets = useMemo(() => [...new Set(inPart.map((e) => e.target))], [inPart]);
  const equipments = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of inPart) count.set(e.equipment, (count.get(e.equipment) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [inPart]);

  const groups = useMemo(() => {
    const words = q.split(/\s+/).filter(Boolean);
    const matches = (e: Exercise) =>
      words.every(
        (w) =>
          e.name.includes(w) ||
          muscleLabel(e.target).toLocaleLowerCase('tr').includes(w) ||
          equipmentLabel(e.equipment).toLocaleLowerCase('tr').includes(w) ||
          partLabel(e.part).toLocaleLowerCase('tr').includes(w),
      );
    const pool = (q ? EXERCISES : inPart).filter(
      (e) => (!q || matches(e)) && (q || !target || e.target === target) && (q || !equipment || e.equipment === equipment),
    );
    const by = new Map<string, Exercise[]>();
    for (const e of pool) {
      const key = q ? e.part : e.target;
      by.set(key, [...(by.get(key) ?? []), e]);
    }
    return [...by.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [q, inPart, target, equipment]);

  const pickMuscle = (muscle: string) => {
    const f = MAP_TO_FILTER[muscle];
    if (!f) return;
    setEquipment(null);
    setFilter({ part: f.part, target: f.target ?? null });
    window.scrollTo({ top: 0 });
  };

  const searchBox = (
    <label className="relative mt-5 block">
      <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-steel" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hareket, kas ya da ekipman ara"
        className="h-14 w-full rounded-full bg-paper pr-12 pl-11 text-[1rem] ring-1 ring-line outline-none placeholder:text-mist focus:ring-2 focus:ring-ink"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          aria-label="Aramayı temizle"
          className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center text-steel"
        >
          <X size={18} />
        </button>
      )}
    </label>
  );

  // ── Arama sonuçları ──
  if (q) {
    const total = groups.reduce((n, [, items]) => n + items.length, 0);
    return (
      <>
        <h1 className="display text-6xl">Hareketler</h1>
        {searchBox}
        <p className="eyebrow mt-4 text-steel">{total} sonuç</p>
        {total === 0 && (
          <p className="mt-6 text-steel">
            "{query}" için hareket bulunamadı. Hareket adları İngilizce: "squat", "row", "press" gibi aramayı dene.
          </p>
        )}
        {groups.map(([key, items]) => (
          <Group key={key} title={partLabel(key)} items={items} />
        ))}
      </>
    );
  }

  // ── Bölge seçimi ──
  if (!part) {
    return (
      <>
        <p className="eyebrow text-steel">{EXERCISES.length} hareket · kas vurgulu animasyonlarla</p>
        <h1 className="display mt-[0.2em] text-[clamp(3.6rem,18vw,7rem)]">Hareketler</h1>
        {searchBox}

        <div className="mt-6 grid gap-2.5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="rounded-[28px] bg-paper p-5 ring-1 ring-line/70">
            <p className="text-sm text-steel">Çalıştırmak istediğin kasa dokun.</p>
            <BodyMap onPick={pickMuscle} className="mx-auto mt-3 h-[19rem] max-w-[17rem]" />
          </div>

          <div className="grid grid-cols-2 content-start gap-2.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {PARTS.map(({ id, label }, i) => (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ease: [0.25, 1, 0.5, 1] }}
                onClick={() => {
                  setEquipment(null);
                  setFilter({ part: id, target: null });
                  window.scrollTo({ top: 0 });
                }}
                className="relative flex h-36 flex-col justify-between overflow-hidden rounded-[24px] bg-paper p-3.5 text-left ring-1 ring-line/70 active:scale-[0.98]"
              >
                <Gif id={COVER[id]} alt="" className="absolute -right-3 -bottom-3 h-28 w-28 opacity-90" />
                <span className="font-mono text-xs text-steel">{COUNT_BY_PART[id]}</span>
                <span className="display relative max-w-[70%] text-[1.6rem]">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── Bir bölgenin hareketleri, kasa göre gruplu ──
  const highlighted = (target ? [target] : targets).flatMap((t) => MUSCLE_TO_MAP[t] ?? []);
  return (
    <>
      <button
        onClick={() => setFilter({ part: null, target: null })}
        className="eyebrow -ml-1 flex h-10 items-center gap-1.5 text-steel"
      >
        <ArrowLeft size={14} /> Bütün bölgeler
      </button>
      <div className="mt-1 flex items-end justify-between gap-4">
        <h1 className="display text-[clamp(3rem,15vw,6rem)]">{partLabel(part)}</h1>
        <BodyMap primary={highlighted} onPick={pickMuscle} className="h-28 w-28 shrink-0 [&_figcaption]:hidden" />
      </div>
      {searchBox}

      {targets.length > 1 && (
        <div className="no-scrollbar -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5">
          {[null, ...targets].map((t) => (
            <button
              key={t ?? 'all'}
              onClick={() => setFilter({ target: t })}
              aria-pressed={target === t}
              className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                target === t ? 'bg-ink text-chalk' : 'bg-paper text-ink ring-1 ring-line'
              }`}
            >
              {t ? muscleLabel(t) : 'Hepsi'}
            </button>
          ))}
        </div>
      )}

      <div className="no-scrollbar -mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5">
        {equipments.map((eq) => (
          <button
            key={eq}
            onClick={() => setEquipment((cur) => (cur === eq ? null : eq))}
            aria-pressed={equipment === eq}
            className={`eyebrow h-9 shrink-0 rounded-full px-3 ${
              equipment === eq ? 'bg-me text-on-me' : 'text-steel ring-1 ring-line'
            }`}
          >
            {equipmentLabel(eq)}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="mt-8 text-steel">Bu seçimde hareket yok. Ekipman filtresini kaldır.</p>}
      {groups.map(([key, items]) => (
        <Group key={`${key}-${equipment}`} title={muscleLabel(key)} items={items} />
      ))}
    </>
  );
}
