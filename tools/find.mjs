// Hareket arama: node tools/find.mjs "lat pulldown" [--part back] [--equipment cable]
// Program yazarken exerciseId bulmak için kullanılır.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = JSON.parse(fs.readFileSync(path.join(root, 'src/data/exercises.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const part = flag('part');
const equipment = flag('equipment');
const target = flag('target');
const words = args.join(' ').toLowerCase().split(/\s+/).filter(Boolean);

const hits = all.filter(
  (e) =>
    words.every((w) => e.name.includes(w)) &&
    (!part || e.part === part) &&
    (!equipment || e.equipment === equipment) &&
    (!target || e.target === target),
);
for (const e of hits.slice(0, 60)) {
  console.log(`${e.id}  ${e.name}  [${e.part} > ${e.target} | ${e.equipment}]`);
}
if (hits.length > 60) console.log(`… +${hits.length - 60} sonuç daha`);
if (!hits.length) console.log('Sonuç yok.');
