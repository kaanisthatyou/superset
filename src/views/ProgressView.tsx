import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Plate } from '../components/Plate';
import { Card, Section, Sparkline } from '../components/bits';
import { fmtDay, mondayOf, today } from '../lib/dates';
import {
  dayProgress,
  exerciseHistory,
  sessionVolume,
  useBody,
  useHistory,
  useMe,
  usePartner,
  useProgram,
  useWeekLog,
} from '../lib/domain';
import { PLATES } from '../lib/labels';
import { useApp } from '../lib/store';
import { useUi } from '../lib/ui';

const fmtKg = (n: number) => n.toLocaleString('tr', { maximumFractionDigits: 1 });

function Delta({ value, unit, goodWhenDown }: { value: number; unit: string; goodWhenDown?: boolean }) {
  if (Math.abs(value) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs text-steel">
        <Minus size={13} /> aynı
      </span>
    );
  }
  const good = goodWhenDown ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-medium ${good ? 'text-plate-green' : 'text-steel'}`}>
      <Icon size={14} strokeWidth={2.5} />
      {fmtKg(Math.abs(value))} {unit}
    </span>
  );
}

function BodyCard({ profileId, editable, color }: { profileId: string; editable: boolean; color: string }) {
  const body = useBody(profileId);
  const entries = useMemo(() => (body?.entries ?? []).filter((e) => e.kg), [body]);
  const last = entries.at(-1);
  const first = entries[0];
  const todays = body?.entries.find((e) => e.date === today());
  const [kg, setKg] = useState(todays?.kg?.toString() ?? '');
  const [waist, setWaist] = useState(todays?.waistCm?.toString() ?? '');

  const save = () => {
    const k = Number(kg.replace(',', '.'));
    const w = Number(waist.replace(',', '.'));
    if (!k && !w) return;
    useApp.getState().addBody({ date: today(), kg: k || undefined, waistCm: w || undefined });
    useUi.getState().showToast('Ölçüm kaydedildi');
  };

  return (
    <Card>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-steel">{last ? `Son tartı · ${fmtDay(last.date)}` : 'Tartı'}</p>
          {last ? (
            <p className="num mt-1 text-6xl">
              {fmtKg(last.kg!)}
              <span className="ml-1 text-2xl text-steel">kg</span>
            </p>
          ) : (
            <p className="display mt-1.5 text-3xl text-mist">Henüz ölçüm yok</p>
          )}
          {last && first && last !== first && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-steel">
              <Delta value={last.kg! - first.kg!} unit="kg" goodWhenDown /> {fmtDay(first.date)} tarihinden beri
            </p>
          )}
        </div>
        <Sparkline values={entries.map((e) => e.kg!)} width={130} height={56} color={color} />
      </div>

      {!last && (
        <p className="mt-3 text-sm text-steel">
          Haftada bir, sabah aç karnına tartıl. Tek tartı değil, haftalar içindeki eğilim önemli.
        </p>
      )}

      {editable && (
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="eyebrow text-steel">Bugün · kg</span>
            <input
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              inputMode="decimal"
              placeholder="74,5"
              className="num mt-1.5 h-13 w-full rounded-2xl bg-chalk px-4 py-2.5 text-2xl ring-1 ring-line outline-none placeholder:text-mist focus:ring-2 focus:ring-ink"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="eyebrow text-steel">Bel · cm</span>
            <input
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              inputMode="decimal"
              placeholder="82"
              className="num mt-1.5 h-13 w-full rounded-2xl bg-chalk px-4 py-2.5 text-2xl ring-1 ring-line outline-none placeholder:text-mist focus:ring-2 focus:ring-ink"
            />
          </label>
          <button type="submit" className="h-[3.25rem] shrink-0 rounded-2xl bg-ink px-5 text-sm font-semibold text-chalk active:scale-95">
            Kaydet
          </button>
        </form>
      )}
    </Card>
  );
}

export function ProgressView() {
  const me = useMe()!;
  const partner = usePartner();
  const [who, setWho] = useState(me.id);
  const profile = who === me.id || !partner ? me : partner;
  const plate = PLATES[profile.color];
  const mine = profile.id === me.id;

  const program = useProgram(profile.id)?.program;
  const log = useWeekLog(profile.id, mondayOf(today()));
  const history = useHistory(profile.id);

  const week = useMemo(() => {
    const sessions = Object.values(log?.sessions ?? {});
    const totals = sessions.map(sessionVolume);
    return {
      planned: program?.days.length ?? 0,
      done: program?.days.filter((d) => dayProgress(d, log?.sessions[d.id]).complete).length ?? 0,
      sets: totals.reduce((n, t) => n + t.sets, 0),
      volume: totals.reduce((n, t) => n + t.volume, 0),
    };
  }, [log, program]);

  const weeks = useMemo(
    () =>
      history.slice(-8).map((w) => {
        const sessions = Object.values(w.sessions).filter((s) => sessionVolume(s).sets > 0);
        return { week: w.week, sessions: sessions.length, volume: sessions.reduce((n, s) => n + sessionVolume(s).volume, 0) };
      }),
    [history],
  );

  const lifts = useMemo(() => {
    const names = new Map<string, string>();
    for (const w of history)
      for (const s of Object.values(w.sessions)) for (const e of Object.values(s.exercises)) names.set(e.exerciseId, e.name);
    return [...names.entries()]
      .map(([id, name]) => ({ id, name, points: exerciseHistory(history, id) }))
      .filter((l) => l.points.length > 0)
      .sort((a, b) => b.points.at(-1)!.date.localeCompare(a.points.at(-1)!.date));
  }, [history]);

  const maxSessions = Math.max(1, ...weeks.map((w) => w.sessions), week.planned);

  return (
    <>
      <p className="eyebrow text-steel">Kayıtlar her set işaretlendiğinde depoya gider</p>
      <h1 className="display mt-[0.2em] text-[clamp(3.6rem,18vw,7rem)]">İlerleme</h1>

      {partner && (
        <div className="mt-5 flex gap-1.5 rounded-full bg-paper p-1.5 ring-1 ring-line/70" role="tablist">
          {[me, partner].map((p) => {
            const active = p.id === profile.id;
            const c = PLATES[p.color];
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => setWho(p.id)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors"
                style={active ? { background: c.bg, color: c.on } : { color: 'var(--color-steel)' }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Antrenman', value: `${week.done}/${week.planned}` },
          { label: 'Set', value: String(week.sets) },
          { label: 'Yük · kg', value: Math.round(week.volume).toLocaleString('tr') },
        ].map((t) => (
          <Card key={t.label} className="!p-3.5">
            <p className="eyebrow text-steel">{t.label}</p>
            <p className="num mt-2 text-[2.4rem]" style={{ color: plate.bg }}>
              {t.value}
            </p>
            <p className="eyebrow mt-1 text-mist">bu hafta</p>
          </Card>
        ))}
      </div>

      <Section title="Kilo">
        <BodyCard key={profile.id} profileId={profile.id} editable={mine} color={plate.bg} />
      </Section>

      <Section title="Haftalar">
        {weeks.length === 0 ? (
          <Card>
            <p className="text-steel">
              {mine ? 'İlk seti işaretlediğinde haftalık özetin burada birikmeye başlar.' : `${profile.name} henüz set işaretlemedi.`}
            </p>
          </Card>
        ) : (
          <Card>
            <div className="flex h-32 items-end gap-2">
              {weeks.map((w) => (
                <div key={w.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="num text-lg">{w.sessions}</span>
                  <span
                    className="w-full max-w-10 rounded-t-lg rounded-b-sm"
                    style={{ height: `${(w.sessions / maxSessions) * 62}%`, minHeight: 4, background: plate.bg }}
                  />
                  <span className="eyebrow !text-[0.55rem] whitespace-nowrap text-steel">{fmtDay(w.week)}</span>
                </div>
              ))}
            </div>
            <p className="eyebrow mt-3 text-mist">Hafta başına antrenman sayısı</p>
          </Card>
        )}
      </Section>

      <Section title="Hareket gelişimi">
        {lifts.length === 0 ? (
          <Card>
            <p className="text-steel">Setlere kg yazdıkça her hareketin en ağır seti burada izlenir.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {lifts.map(({ id, name, points }) => {
              const last = points.at(-1)!;
              return (
                <button
                  key={id}
                  onClick={() => useUi.getState().open({ type: 'exercise', id })}
                  className="flex items-center gap-3 rounded-[22px] bg-paper p-3.5 text-left ring-1 ring-line/70 active:scale-[0.985]"
                >
                  <Plate size={46} fill={1} color={plate.bg} onColor={plate.on}>
                    <span className="num text-[1.05rem]">{fmtKg(last.kg)}</span>
                  </Plate>
                  <span className="min-w-0 flex-1">
                    <span lang="en" className="block truncate font-semibold">
                      {name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-steel">
                      {last.reps} × {fmtKg(last.kg)} kg
                      {points.length > 1 && <Delta value={last.kg - points[0].kg} unit="kg" />}
                    </span>
                  </span>
                  <Sparkline values={points.map((p) => p.kg)} width={84} height={34} color={plate.bg} />
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
