import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pbkdf2Sync } from 'node:crypto';

// Site şifresi (src/lib/lock.ts): yayında GitHub secret'ı APP_PASSWORD'den gelir, koda yalnızca özeti girer.
// Yerelde tanımlı değilse kapı kapalı değildir; CI'da tanımlı değilse yayın durur ki site açık kalmasın.
const password = process.env.APP_PASSWORD?.normalize('NFC').trim();
if (process.env.CI && !password) {
  throw new Error('APP_PASSWORD yok: GitHub → Settings → Secrets and variables → Actions içine ekle.');
}
const LOCK_SALT = 'superset-kilit-v1';
const LOCK_ITERATIONS = 600_000;
const lock = password && {
  salt: LOCK_SALT,
  iterations: LOCK_ITERATIONS,
  hash: pbkdf2Sync(password, LOCK_SALT, LOCK_ITERATIONS, 32, 'sha256').toString('hex'),
};

export default defineConfig({
  // Göreli taban: GitHub Pages alt klasöründe de, kök alan adında da çalışsın.
  base: './',
  define: { __LOCK__: JSON.stringify(lock || null) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Süperset',
        short_name: 'Süperset',
        description: 'İki kişilik antrenman defteri: haftalık program, set takibi, ilerleme.',
        lang: 'tr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#eceef0',
        theme_color: '#eceef0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
          {
            urlPattern: /^https:\/\/static\.exercisedb\.dev\/media\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-gifs',
              expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/image-cdn[^/]*\.spotifycdn\.com\/|^https:\/\/i\.scdn\.co\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 80, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
