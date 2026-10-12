// tools/ altındaki betiklerin ortak yardımcıları.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Özel veri deposunun yerel kopyası. --data <yol> ile değiştirilebilir. */
export function dataDir(argv = process.argv) {
  const i = argv.indexOf('--data');
  return path.resolve(i >= 0 ? argv[i + 1] : path.join(root, 'data'));
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: path.join(dir, f), name: f.replace(/\.json$/, ''), data: readJson(path.join(dir, f)) }));
}

export const exercises = () => readJson(path.join(root, 'src/data/exercises.json'));

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const weekdayOf = (s) => ((parseDate(s).getDay() + 6) % 7) + 1;
export const mondayOf = (s) => addDays(s, 1 - weekdayOf(s));
export const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
