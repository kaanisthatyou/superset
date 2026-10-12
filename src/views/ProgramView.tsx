import { motion } from 'motion/react';
import { ArrowRight, Check, ChevronRight, CloudOff, RefreshCw } from 'lucide-react';
import { Gif } from '../components/Gif';
import { Plate } from '../components/Plate';
import { Section } from '../components/bits';
import { addDays, DAYS_LONG, DAYS_SHORT, fmtDay, fmtRange, fmtTime, isoWeek, mondayOf, today, weekdayOf } from '../lib/dates';
import { dayProgress, daysByWeekday, pickToday, useMe, usePartner, useProgram, useWeekLog } from '../lib/domain';
import { exerciseName } from '../lib/exercises';
import { PLATES } from '../lib/labels';
import { useApp } from '../lib/store';
import { syncNow, useSync } from '../lib/sync';
import type { Profile, Program, ProgramDay, WeekLog } from '../lib/types';
import { useUi } from '../lib/ui';

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
        <path d="M32 4a28 28 0 0 0 0 56z" fill="var(--me)" />
        <path d="M32 4a28 28 0 0 1 0 56z" fill="var(--you)" />
        <circle cx="32" cy="32" r="19" fill="none" stroke="var(--color-chalk)" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="7.5" fill="var(--color-chalk)" />
      </svg>
      <span className="display text-[1.45rem] tracking-[0.01em]">Süperset</span>
    </span>
  );
}

function SyncBadge() {
  const { status, at, error } = useSync();
  const pending = useApp((s) => Object.keys(s.dirty).length);
  const connected = useApp((s) => !!s.gh);
  const text = !connected
    ? 'Depo bağlı değil'
    : status === 'syncing'
      ? 'Eşitleniyor'
      : status === 'error'
        ? 'Eşitlenemedi'
        : status === 'offline'
          ? `Çevrimdışı${pending ? ` · ${pending} bekliyor` : ''}`
          : pending
            ? `${pending} değişiklik bekliyor`
            : at
              ? `Eşitlendi ${fmtTime(at)}`
              : 'Bağlı';
  const warn = status === 'error';
  return (
    <button
      onClick={() => (connected && status !== 'error' ? void syncNow() : useUi.getState().open({ type: 'settings' }))}
      title={error ?? undefined}
      className={`eyebrow flex h-9 items-center gap-1.5 rounded-full px-3 whitespace-nowrap ring-1 ${
        warn ? 'bg-plate-red text-paper ring-plate-red' : 'text-steel ring-line'
      }`}
    >
      {warn || !connected || status === 'offline' ? <CloudOff size={12} /> : <RefreshCw size={12} className={status === 'syncing' ? 'animate-spin' : ''} />}
      {text}
    </button>
  );
}

/** Haftanın yedi günü, iki kişi: üstte ben, altta partner. */
function WeekRail({
  rows,
}: {
  rows: { profile: Profile; program: Program | undefined; log: WeekLog | undefined; mine: boolean }[];
}) {
  const wd = weekdayOf(today());
  return (
    <div className="rounded-[24px] bg-paper px-3 pt-3 pb-3.5 ring-1 ring-line/70">
      <div className="grid grid-cols-[1.75rem_repeat(7,1fr)] items-center gap-y-2">
        <span />
        {DAYS_SHORT.map((d, i) => (
          <span
            key={d}
            className={`eyebrow justify-self-center rounded-full px-1.5 py-0.5 ${
              i + 1 === wd ? 'bg-ink text-chalk' : 'text-steel'
            }`}
          >
            {d}
          </span>
        ))}
        {rows.map(({ profile, program, log, mine }) => {
          const plan = daysByWeekday(program);
          const plate = PLATES[profile.color];
          return [
            <span key={profile.id} className="num text-lg" style={{ color: plate.bg }} title={profile.name}>
              {profile.name.slice(0, 1).toLocaleUpperCase('tr')}
            </span>,
            ...DAYS_SHORT.map((_, i) => {
              const day = plan.get(i + 1);
              const p = day ? dayProgress(day, log?.sessions[day.id]) : null;
              return (
                <span key={`${profile.id}-${i}`} className="grid place-items-center">
                  {day && p ? (
                    <Plate
                      size={mine ? 34 : 26}
                      fill={p.complete ? 1 : p.done / p.total}
                      color={plate.bg}
                      onColor={plate.on}
                    >
                      {p.complete && <Check size={mine ? 15 : 12} strokeWidth={3.5} />}
                    </Plate>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-line" />
                  )}
                </span>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

function DayRow({ day, log, index }: { day: ProgramDay; log: WeekLog | undefined; index: number }) {
  const p = dayProgress(day, log?.sessions[day.id]);
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.05, ease: [0.25, 1, 0.5, 1] }}
      onClick={() => useUi.getState().open({ type: 'session', dayId: day.id })}
      className="flex w-full items-center gap-3.5 rounded-[24px] bg-paper p-3.5 text-left ring-1 ring-line/70 active:scale-[0.985]"
    >
      <Plate size={52} fill={p.complete ? 1 : p.done / p.total}>
        {p.complete ? (
          <Check size={22} strokeWidth={3.5} />
        ) : (
          <span className="eyebrow !text-[0.6rem]">{DAYS_SHORT[day.weekday - 1]}</span>
        )}
      </Plate>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-[1.5rem]">{day.title}</span>
        <span className="mt-0.5 block truncate text-sm text-steel">
          {day.together && <span className="mr-1.5 font-semibold text-ink">Birlikte ·</span>}
          {day.exercises.length} hareket{day.minutes ? ` · ~${day.minutes} dk` : ''}
          {p.started && !p.complete ? ` · ${p.done}/${p.total} set` : ''}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-mist" />
    </motion.button>
  );
}

export function ProgramView() {
  const me = useMe()!;
  const partner = usePartner();
  const mine = useProgram(me.id);
  const theirs = useProgram(partner?.id);
  const week = mondayOf(today());
  const myLog = useWeekLog(me.id, week);
  const theirLog = useWeekLog(partner?.id, week);
  const open = useUi((s) => s.open);

  const header = (
    <header className="flex items-center justify-between gap-3">
      <Wordmark />
      <div className="flex items-center gap-2">
        <SyncBadge />
        <button onClick={() => open({ type: 'settings' })} aria-label="Ayarlar" className="active:scale-95">
          <Plate size={38} fill={1}>
            <span className="num text-lg">{me.name.slice(0, 1).toLocaleUpperCase('tr')}</span>
          </Plate>
        </button>
      </div>
    </header>
  );

  if (!mine) {
    return (
      <>
        {header}
        <div className="mt-16">
          <p className="eyebrow text-steel">Program yok</p>
          <h1 className="display mt-2 text-6xl">Henüz program yazılmadı</h1>
          <p className="mt-4 max-w-sm text-steel">
            Bilgisayarda Claude Code'u açıp <code className="font-mono text-ink">/gym</code> yazınca {me.name} için ilk
            hafta hazırlanır ve burada görünür.
          </p>
        </div>
      </>
    );
  }

  const { program, expired } = mine;
  const pick = pickToday(program, myLog);
  const wd = weekdayOf(today());
  const day = pick.day;
  const p = day ? dayProgress(day, myLog?.sessions[day.id]) : null;

  const eyebrow = {
    today: `Bugün · ${DAYS_LONG[wd - 1]}`,
    resume: 'Yarım kaldı',
    done: `Bugün tamam · ${DAYS_LONG[wd - 1]}`,
    missed: day ? `${DAYS_LONG[day.weekday - 1]} gününden kaldı` : '',
    rest: `Bugün dinlenme · ${DAYS_LONG[wd - 1]}`,
    weekDone: 'Bu hafta tamam',
  }[pick.kind];

  const title = pick.kind === 'rest' ? 'Dinlen' : pick.kind === 'weekDone' ? 'Hafta bitti' : day!.title;
  const cta =
    pick.kind === 'today' || pick.kind === 'missed'
      ? p!.started
        ? `Devam et · ${p!.done}/${p!.total} set`
        : 'Antrenmana başla'
      : pick.kind === 'resume'
        ? `Devam et · ${p!.done}/${p!.total} set`
        : pick.kind === 'rest'
          ? `Sıradaki: ${DAYS_LONG[day!.weekday - 1]} — ${day!.title}`
          : null;

  return (
    <>
      {header}

      <motion.section
        className="mt-9"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      >
        <p className="eyebrow text-steel">{eyebrow}</p>
        <h1 className="display mt-[0.2em] text-[clamp(3.6rem,18vw,7.5rem)] text-balance">{title}</h1>
        {day && pick.kind !== 'rest' && (
          <p className="mt-3 text-steel">
            {[day.subtitle, `${day.exercises.length} hareket`, day.minutes && `~${day.minutes} dk`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {pick.kind === 'weekDone' && (
          <p className="mt-3 max-w-sm text-steel">Bu haftanın bütün antrenmanları işaretlendi. İyi dinlen.</p>
        )}

        {day && pick.kind !== 'rest' && pick.kind !== 'done' && (
          <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
            {day.exercises.map((e, i) => (
              <div key={e.exerciseId + i} className="w-[5.5rem] shrink-0">
                <Gif id={e.exerciseId} alt="" className="h-[5.5rem] w-[5.5rem] rounded-2xl bg-paper ring-1 ring-line/70" />
                <p lang="en" className="mt-1.5 line-clamp-2 text-[0.7rem] leading-tight font-medium text-steel">
                  {exerciseName(e.exerciseId, e.name)}
                </p>
              </div>
            ))}
          </div>
        )}

        {cta && day && (
          <button
            onClick={() => open({ type: 'session', dayId: day.id })}
            className={`mt-6 flex h-16 w-full items-center justify-between rounded-full pl-7 pr-2 text-left active:scale-[0.985] ${
              pick.kind === 'rest' ? 'bg-paper text-ink ring-1 ring-line' : 'bg-me text-on-me'
            }`}
          >
            <span className={pick.kind === 'rest' ? 'font-medium' : 'display text-[1.7rem]'}>{cta}</span>
            <span
              className={`grid h-12 w-12 place-items-center rounded-full ${
                pick.kind === 'rest' ? 'bg-chalk' : 'bg-ink/20'
              }`}
            >
              <ArrowRight size={22} strokeWidth={2.75} />
            </span>
          </button>
        )}
      </motion.section>

      <Section
        title="Bu hafta"
        aside={
          <span className="eyebrow text-steel">
            Hafta {isoWeek(today())} · {fmtRange(week, addDays(week, 6))}
          </span>
        }
      >
        <WeekRail
          rows={[
            { profile: me, program, log: myLog, mine: true },
            ...(partner ? [{ profile: partner, program: theirs?.program, log: theirLog, mine: false }] : []),
          ]}
        />
        <div className="mt-3 flex flex-col gap-2.5">
          {program.days.map((d, i) => (
            <DayRow key={d.id} day={d} log={myLog} index={i} />
          ))}
        </div>
      </Section>

      {(program.coachNote || program.review || expired) && (
        <section className="mt-9 rounded-[28px] bg-ink p-6 text-chalk">
          <p className="eyebrow text-mist">Koç notu · {program.title}</p>
          {expired && (
            <p className="mt-3 rounded-2xl bg-chalk/10 p-3 text-sm">
              Bu programın süresi {fmtDay(program.endDate)} günü doldu; yenisi gelene kadar aynı hafta tekrar ediyor.
              Bilgisayarda Claude Code'a <code className="font-mono">/gym</code> yazınca kayıtlarınıza bakıp yeni haftayı
              hazırlarım.
            </p>
          )}
          {program.review && (
            <>
              <p className="display mt-4 text-2xl">Geçen hafta</p>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-chalk/85">{program.review}</p>
            </>
          )}
          {program.coachNote && (
            <>
              <p className="display mt-4 text-2xl">Bu hafta</p>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-chalk/85">{program.coachNote}</p>
            </>
          )}
        </section>
      )}
    </>
  );
}
