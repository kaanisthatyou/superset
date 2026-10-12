// PWA ikonlarını üretir (tek seferlik): npm run icons
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// İkon: ikiye bölünmüş bir ağırlık plakası — iki kişi, tek halter.
const plate = (size, pad, radius) => {
  const c = size / 2;
  const r = c - pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#14161a"/>
  <path d="M${c} ${c - r}a${r} ${r} 0 0 0 0 ${2 * r}z" fill="#2353e0"/>
  <path d="M${c} ${c - r}a${r} ${r} 0 0 1 0 ${2 * r}z" fill="#e0392b"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.68}" fill="none" stroke="#14161a" stroke-width="${size * 0.035}"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.27}" fill="#14161a"/>
</svg>`;
};

const jobs = [
  ['icon-192.png', plate(192, 30, 42)],
  ['icon-512.png', plate(512, 80, 112)],
  ['icon-maskable-512.png', plate(512, 128, 0)],
  ['apple-touch-icon.png', plate(180, 30, 0)],
];
for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(pub, name));
  console.log('yazıldı', name);
}
