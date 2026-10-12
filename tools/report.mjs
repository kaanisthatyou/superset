// Koçun (Claude) okuması için durum raporu: node tools/report.mjs [--data <yol>] [--weeks 3] [--today YYYY-AA-GG]
// Her kişi için: programın durumu, hafta hafta uyum, set set kayıtlar, hareket gelişimi, kilo ve dikkat çeken noktalar.
import fs from 'node:fs';
import path from 'node:path';
import { addDays, dataDir, DAYS, exercises, iso, listJson, mondayOf, parseDate, readJson, weekdayOf } from './lib.mjs';

const dir = dataDir();
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const today = arg('today', iso(new Date()));
const weeksShown = Number(arg('weeks', 3));
const FEELS = ['çok kolay', 'kolay', 'tam kıvamında', 'zor', 'çok zor'];
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const dbNames = new Map(exercises().map((e) => [e.id, e.name]));
const out = [];
const say = (line = '') => out.push(line);

if (!fs.existsSync(path.join(dir, 'profiles.json'))) {
  console.error(`Veri deposu bulunamadı: ${dir}\nÖnce depoyu klonla (bkz. skill/gym/SKILL.md).`);
  process.exit(1);
}

const fmtSet = (s, unit) =>
  !s?.done ? '—' : unit === 'reps' ? (s.kg ? `${s.reps ?? '?'}×${s.kg}kg` : `${s.reps ?? '?'} tk`) : `${s.reps ?? '?'} ${unit === 'sec' ? 'sn' : 'dk'}`;

/** "10-12" → [10, 12]; "30" → [30, 30] */
const range = (reps) => {
  const n = (reps.match(/\d+/g) ?? []).map(Number);
  return n.length ? [n[0], n[1] ?? n[0]] : [0, 0];
};

say(`SÜPERSET DURUM RAPORU — bugün ${today} (${DAYS[weekdayOf(today) - 1]}), bu haftanın pazartesisi ${mondayOf(today)}`);

const { profiles } = readJson(path.join(dir, 'profiles.json'));
for (const profile of profiles) {
  say();
  say('='.repeat(72));
  say(`${profile.name.toUpperCase()}  (id: ${profile.id})`);
  const facts = Object.entries(profile)
    .filter(([k, v]) => !['id', 'name', 'color'].includes(k) && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  if (facts.length) say(facts.join(' | '));
  const blanks = Object.entries(profile).filter(([, v]) => v === null || v === '').map(([k]) => k);
  if (blanks.length) say(`Eksik profil bilgisi (sor): ${blanks.join(', ')}`);

  // ── Program durumu ──
  const programs = listJson(path.join(dir, 'programs', profile.id)).map((f) => f.data);
  const byId = new Map(programs.map((p) => [p.id, p]));
  const started = programs.filter((p) => p.startDate <= today);
  const current = started.at(-1);
  const upcoming = programs.find((p) => p.startDate > today);
  say();
  if (!current) {
    say(`PROGRAM: yok${upcoming ? ` (sıradaki ${upcoming.startDate} tarihinde başlıyor)` : ''} → YENİ PROGRAM GEREKLİ`);
  } else {
    const left = daysBetween(today, current.endDate);
    const status =
      left < 0
        ? `BİTTİ (${-left} gün önce) → YENİ PROGRAM GEREKLİ${upcoming ? ` — ama ${upcoming.startDate} için yazılmış bir program zaten var` : ''}`
        : left === 0
          ? 'BUGÜN BİTİYOR → yeni haftayı şimdi yazmak uygun'
          : `sürüyor, ${left} gün kaldı`;
    say(`PROGRAM: "${current.title}" (${current.id})  ${current.startDate} → ${current.endDate}  —  ${status}`);
    say(`  Günler: ${current.days.map((d) => `${DAYS[d.weekday - 1]} ${d.title} (${d.exercises.length} hareket)`).join(' · ')}`);
  }

  // ── Haftalar ──
  const logs = listJson(path.join(dir, 'logs', profile.id)).map((f) => f.data);
  if (!logs.length) say('\nKAYIT: henüz hiç set işaretlenmemiş.');
  const flags = [];

  for (const log of logs.slice(-weeksShown)) {
    const sessions = Object.values(log.sessions ?? {}).sort((a, b) => a.date.localeCompare(b.date));
    const program = byId.get(sessions[0]?.programId) ?? started.filter((p) => p.startDate <= addDays(log.week, 6)).at(-1);
    const planned = program?.days ?? [];
    let doneSets = 0;
    let plannedSets = 0;
    const lines = [];

    for (const day of planned) {
      const s = log.sessions?.[day.id];
      const total = day.exercises.reduce((n, e) => n + e.sets, 0);
      plannedSets += total;
      if (!s) {
        const due = addDays(log.week, day.weekday - 1);
        lines.push(`  - ${DAYS[day.weekday - 1]} · ${day.title}: ${due > today ? 'henüz günü gelmedi' : 'YAPILMADI'}`);
        if (due < today && log.week === mondayOf(today)) flags.push(`${day.title} (${DAYS[day.weekday - 1]}) bu hafta atlandı`);
        continue;
      }
      let done = 0;
      const exLines = [];
      for (const e of day.exercises) {
        const sets = s.exercises?.[e.exerciseId]?.sets ?? [];
        const ok = sets.filter((x) => x.done);
        done += Math.min(e.sets, ok.length);
        const name = s.exercises?.[e.exerciseId]?.name ?? e.name ?? dbNames.get(e.exerciseId) ?? e.exerciseId;
        let mark = '';
        if (e.unit === 'reps' && ok.length) {
          const [lo, hi] = range(e.reps);
          const reps = ok.map((x) => x.reps ?? 0);
          if (ok.length >= e.sets && reps.every((r) => r >= hi)) mark = '  ▲ tüm setler üst sınırda';
          else if (reps.some((r) => r < lo)) mark = '  ▼ alt sınırın altında set var';
          if (e.weighted && ok.every((x) => !x.kg)) mark += '  (kg yazılmamış)';
        }
        if (ok.length < e.sets) mark += `  (${ok.length}/${e.sets} set)`;
        exLines.push(
          `      ${name.padEnd(34).slice(0, 34)} hedef ${`${e.sets}×${e.reps}`.padEnd(9)} → ${Array.from({ length: Math.max(e.sets, sets.length) }, (_, i) => fmtSet(sets[i], e.unit)).join(', ')}${mark}`,
        );
        if (log === logs.at(-1) && mark.includes('▲')) flags.push(`${name}: tüm setler üst sınırda → ağırlık/zorluk artırılabilir`);
        if (log === logs.at(-1) && mark.includes('▼')) flags.push(`${name}: hedefin altında kaldı → ağırlık fazla olabilir`);
      }
      doneSets += done;
      const feel = s.feel ? ` · his: ${FEELS[s.feel - 1]}` : '';
      const note = s.note ? ` · not: "${s.note}"` : '';
      const mins = s.startedAt && s.finishedAt ? ` · ${Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000)} dk` : '';
      lines.push(`  - ${DAYS[weekdayOf(s.date) - 1]} ${s.date} · ${day.title}: ${done}/${total} set${s.finishedAt ? '' : ' (bitir denmemiş)'}${mins}${feel}${note}`);
      lines.push(...exLines);
      if (s.note && log === logs.at(-1)) flags.push(`Not (${day.title}): "${s.note}"`);
      if (s.feel >= 5 && log === logs.at(-1)) flags.push(`${day.title} "çok zor" bulundu`);
      if (s.feel <= 1 && s.feel && log === logs.at(-1)) flags.push(`${day.title} "çok kolay" bulundu`);
    }

    const sessionCount = planned.filter((d) => log.sessions?.[d.id]).length;
    say();
    say(`HAFTA ${log.week}${log.week === mondayOf(today) ? ' (bu hafta)' : ''} — ${sessionCount}/${planned.length} antrenman, ${doneSets}/${plannedSets} set${program ? ` — program: ${program.title}` : ''}`);
    for (const l of lines) say(l);
  }

  // ── Hareket gelişimi ──
  const series = new Map();
  for (const log of logs) {
    for (const s of Object.values(log.sessions ?? {})) {
      for (const e of Object.values(s.exercises ?? {})) {
        const sets = e.sets.filter((x) => x.done && x.kg && x.reps);
        if (!sets.length) continue;
        const top = sets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a));
        if (!series.has(e.exerciseId)) series.set(e.exerciseId, { name: e.name, points: [] });
        series.get(e.exerciseId).points.push({ date: s.date, kg: top.kg, reps: top.reps });
      }
    }
  }
  if (series.size) {
    say();
    say('HAREKET GELİŞİMİ (seans başına en ağır set, eskiden yeniye)');
    for (const { name, points } of series.values()) {
      points.sort((a, b) => a.date.localeCompare(b.date));
      const delta = points.length > 1 ? points.at(-1).kg - points[0].kg : 0;
      say(`  ${name.padEnd(34).slice(0, 34)} ${points.slice(-6).map((p) => `${p.reps}×${p.kg}`).join(' → ')}${points.length > 1 ? `   (${delta >= 0 ? '+' : ''}${delta} kg, ${points.length} seans)` : ''}`);
      if (points.length >= 3 && points.slice(-3).every((p) => p.kg === points.at(-1).kg && p.reps <= points.at(-3).reps))
        flags.push(`${name}: son 3 seanstır ilerleme yok (plato)`);
    }
  }

  // ── Vücut ──
  const bodyFile = path.join(dir, 'body', `${profile.id}.json`);
  const body = fs.existsSync(bodyFile) ? (readJson(bodyFile).entries ?? []) : [];
  say();
  if (!body.length) say('KİLO: ölçüm girilmemiş.');
  else {
    say(`KİLO: ${body.slice(-8).map((e) => `${e.date.slice(5)} ${e.kg ?? '?'}kg${e.waistCm ? `/bel ${e.waistCm}cm` : ''}`).join(' · ')}`);
    const withKg = body.filter((e) => e.kg);
    if (withKg.length > 1) {
      const first = withKg[0];
      const last = withKg.at(-1);
      const weeks = Math.max(1, daysBetween(first.date, last.date) / 7);
      const rate = (last.kg - first.kg) / weeks;
      say(`  Değişim: ${(last.kg - first.kg).toFixed(1)} kg / ${weeks.toFixed(1)} hafta (haftada ${rate.toFixed(2)} kg)`);
      if (rate < -1) flags.push(`Kilo çok hızlı düşüyor (haftada ${rate.toFixed(1)} kg) → beslenmeyi konuş, açığı küçült`);
      if (rate > -0.1 && weeks >= 3) flags.push(`${weeks.toFixed(0)} haftadır kilo düşmüyor → beslenme ve adım sayısını konuş`);
    }
    if (daysBetween(body.at(-1).date, today) > 10) flags.push(`Son tartı ${daysBetween(body.at(-1).date, today)} gün önce → tartılmasını hatırlat`);
  }

  if (flags.length) {
    say();
    say('DİKKAT ÇEKENLER');
    for (const f of [...new Set(flags)]) say(`  • ${f}`);
  }
}

const journal = path.join(dir, 'coach', 'journal.md');
say();
say('='.repeat(72));
say(fs.existsSync(journal) ? `Koç günlüğü: ${journal} (karar vermeden önce son kayıtları oku)` : 'Koç günlüğü henüz yok (coach/journal.md).');
console.log(out.join('\n'));
