// Ham veri setindeki her hareketin GIF'i gerçekten var mı diye bakar;
// olmayanların id'lerini tools/raw/missing-gifs.json dosyasına yazar.
// build-exercises.mjs bu listeyi okuyup o hareketleri dizinden çıkarır.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/raw/exercisedb.json'), 'utf8'));

const missing = [];
const unknown = [];
const queue = [...raw];
let checked = 0;

async function worker() {
  for (let e = queue.shift(); e; e = queue.shift()) {
    let status = 0;
    for (let attempt = 0; attempt < 3 && (status === 0 || status === 429 || status >= 500); attempt++) {
      try {
        status = (await fetch(e.gifUrl, { method: 'HEAD' })).status;
      } catch {
        status = 0;
      }
      if (status === 0 || status === 429 || status >= 500) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (status === 404 || status === 403) missing.push(e.exerciseId);
    else if (status !== 200) unknown.push(`${e.exerciseId}:${status}`);
    if (++checked % 250 === 0) console.log(`${checked}/${raw.length}`);
  }
}

await Promise.all(Array.from({ length: 12 }, worker));
fs.writeFileSync(path.join(root, 'tools/raw/missing-gifs.json'), JSON.stringify(missing.sort()));
console.log(`eksik: ${missing.length}, belirsiz: ${unknown.length}`, unknown.slice(0, 10).join(' '));
