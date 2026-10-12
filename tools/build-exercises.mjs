// Ham ExerciseDB dökümünü (tools/raw/exercisedb.json) uygulamanın kullandığı iki dosyaya çevirir:
//   src/data/exercises.json     -> liste/filtre için hafif kayıtlar
//   src/data/instructions.json  -> id -> adımlar (detay açılınca tembel yüklenir)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = JSON.parse(fs.readFileSync(path.join(root, 'tools/raw/exercisedb.json'), 'utf8'));
// Kaynakta animasyonu bulunmayan hareketler (tools/check-gifs.mjs üretir) dizine alınmaz.
const missingFile = path.join(root, 'tools/raw/missing-gifs.json');
const missing = new Set(fs.existsSync(missingFile) ? JSON.parse(fs.readFileSync(missingFile, 'utf8')) : []);
const raw = all.filter((e) => !missing.has(e.exerciseId));

const exercises = raw
  .map((e) => ({
    id: e.exerciseId,
    name: e.name,
    part: e.bodyParts[0],
    target: e.targetMuscles[0],
    secondary: e.secondaryMuscles,
    equipment: e.equipments[0],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const instructions = Object.fromEntries(
  raw.map((e) => [e.exerciseId, e.instructions.map((s) => s.replace(/^Step:\d+\s*/, ''))]),
);

fs.writeFileSync(path.join(root, 'src/data/exercises.json'), JSON.stringify(exercises));
fs.writeFileSync(path.join(root, 'src/data/instructions.json'), JSON.stringify(instructions));
console.log(`${exercises.length} hareket yazıldı (${all.length - raw.length} tanesi animasyonu olmadığı için atlandı)`);
