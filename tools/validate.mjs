// Veri deposundaki programları ve profilleri denetler: node tools/validate.mjs [--data <yol>]
// Uygulamanın okuyamayacağı ya da yanlış göstereceği her şeyi hata olarak basar; hata varsa çıkış kodu 1.
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, exercises, listJson, readJson, weekdayOf } from './lib.mjs';

const dir = dataDir();
const known = new Map(exercises().map((e) => [e.id, e]));
const errors = [];
const warnings = [];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNITS = ['reps', 'sec', 'min'];
const COLORS = ['red', 'blue', 'yellow', 'green'];

if (!fs.existsSync(path.join(dir, 'profiles.json'))) {
  console.error(`profiles.json bulunamadı: ${dir}`);
  process.exit(1);
}

const profiles = readJson(path.join(dir, 'profiles.json')).profiles ?? [];
if (profiles.length !== 2) warnings.push(`profiles.json: ${profiles.length} profil var (uygulama iki kişi için tasarlandı)`);
for (const p of profiles) {
  if (!p.id || !p.name) errors.push(`profiles.json: id ve name zorunlu (${JSON.stringify(p).slice(0, 60)})`);
  if (!COLORS.includes(p.color)) errors.push(`profiles.json: ${p.id} için color şunlardan biri olmalı: ${COLORS.join(', ')}`);
}

const seenIds = new Set();
let count = 0;
for (const profile of profiles) {
  const files = listJson(path.join(dir, 'programs', profile.id));
  if (!files.length) warnings.push(`${profile.id}: hiç program yok`);
  for (const { file, name, data: p } of files) {
    count++;
    const at = path.relative(dir, file).replaceAll('\\', '/');
    const err = (msg) => errors.push(`${at}: ${msg}`);

    for (const key of ['id', 'profile', 'title', 'startDate', 'endDate', 'days']) if (!p[key]) err(`"${key}" eksik`);
    if (p.profile !== profile.id) err(`profile "${p.profile}" ama dosya ${profile.id} klasöründe`);
    if (seenIds.has(p.id)) err(`id "${p.id}" başka bir programda da var`);
    seenIds.add(p.id);
    if (!DATE.test(p.startDate ?? '') || !DATE.test(p.endDate ?? '')) err('startDate/endDate YYYY-AA-GG olmalı');
    else {
      if (p.startDate !== name) err(`dosya adı startDate ile aynı olmalı (${p.startDate}.json)`);
      if (p.endDate < p.startDate) err('endDate, startDate tarihinden önce');
      if (weekdayOf(p.startDate) !== 1) warnings.push(`${at}: startDate pazartesi değil; uygulama haftayı pazartesiden sayar`);
    }
    if (!Array.isArray(p.days) || !p.days.length) {
      err('days boş');
      continue;
    }

    const dayIds = new Set();
    const weekdays = new Set();
    for (const d of p.days) {
      const where = `gün "${d.id ?? '?'}"`;
      if (!d.id || !d.title) err(`${where}: id ve title zorunlu`);
      if (dayIds.has(d.id)) err(`${where}: gün id'si tekrar ediyor`);
      dayIds.add(d.id);
      if (!Number.isInteger(d.weekday) || d.weekday < 1 || d.weekday > 7) err(`${where}: weekday 1–7 olmalı`);
      if (weekdays.has(d.weekday)) err(`${where}: aynı weekday (${d.weekday}) iki günde kullanılmış`);
      weekdays.add(d.weekday);
      if (!Array.isArray(d.exercises) || !d.exercises.length) {
        err(`${where}: exercises boş`);
        continue;
      }
      const used = new Set();
      for (const [i, e] of d.exercises.entries()) {
        const ex = `${where}, ${i + 1}. hareket (${e.exerciseId})`;
        if (!known.has(e.exerciseId)) err(`${ex}: bu id dizinde yok — node tools/find.mjs ile ara`);
        // Kayıtlar gün içinde exerciseId ile tutulur; aynı hareket iki kez yazılırsa setler karışır.
        if (used.has(e.exerciseId)) err(`${ex}: aynı hareket bu günde iki kez var`);
        used.add(e.exerciseId);
        if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 8) err(`${ex}: sets 1–8 arası tam sayı olmalı`);
        if (typeof e.reps !== 'string' || !/\d/.test(e.reps)) err(`${ex}: reps, içinde sayı olan bir metin olmalı ("10-12")`);
        if (!UNITS.includes(e.unit)) err(`${ex}: unit şunlardan biri olmalı: ${UNITS.join(', ')}`);
        if (typeof e.restSec !== 'number' || e.restSec < 0) err(`${ex}: restSec sayı olmalı (saniye)`);
        if (typeof e.weighted !== 'boolean') err(`${ex}: weighted true/false olmalı`);
        if (e.weighted && e.unit !== 'reps') err(`${ex}: süreli hareketlerde weighted false olmalı`);
        if (!e.tip) warnings.push(`${at}: ${ex}: ipucu (tip) yok`);
        if (e.song && !/^[A-Za-z0-9]{22}$/.test(e.song.id ?? '')) err(`${ex}: song.id 22 karakterlik Spotify parça id'si olmalı`);
      }
    }
  }
}

if (fs.existsSync(path.join(dir, 'music.json'))) {
  const music = readJson(path.join(dir, 'music.json'));
  for (const vibe of ['power', 'cardio', 'calm']) {
    const list = music.vibes?.[vibe];
    if (!Array.isArray(list) || !list.length) errors.push(`music.json: vibes.${vibe} boş`);
    for (const t of list ?? [])
      if (!/^[A-Za-z0-9]{22}$/.test(t.id ?? '') || !t.title || !t.artist) errors.push(`music.json: ${vibe} içinde bozuk kayıt: ${JSON.stringify(t).slice(0, 80)}`);
  }
}

for (const w of warnings) console.log(`uyarı  ${w}`);
for (const e of errors) console.log(`HATA   ${e}`);
console.log(`\n${count} program denetlendi: ${errors.length} hata, ${warnings.length} uyarı.`);
process.exit(errors.length ? 1 : 0);
