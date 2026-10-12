import { create } from 'zustand';
import type { GhConfig } from './github';
import { useApp } from './store';

// ── "Uygulamayı yükle" ─────────────────────────────────────────────────────

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstall = create<{ event: InstallPromptEvent | null; installed: boolean }>(() => ({
  event: null,
  installed: window.matchMedia('(display-mode: standalone)').matches,
}));

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  useInstall.setState({ event: e as InstallPromptEvent });
});
window.addEventListener('appinstalled', () => useInstall.setState({ event: null, installed: true }));

export async function install() {
  const { event } = useInstall.getState();
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  useInstall.setState({ event: null });
}

// ── Kurulum bağlantısı ─────────────────────────────────────────────────────
// Depo bilgisi ve anahtar, adresin # sonrasında taşınır; bu kısım sunucuya gönderilmez.

interface SetupPayload {
  o: string;
  r: string;
  t: string;
  p?: string;
}

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function setupLink(cfg: GhConfig, profile?: string) {
  const payload: SetupPayload = { o: cfg.owner, r: cfg.repo, t: cfg.token, p: profile };
  return `${location.origin}${location.pathname}#kur=${toBase64Url(JSON.stringify(payload))}`;
}

/** Açılışta bir kez: adreste kurulum bilgisi varsa uygula ve adresten sil. */
export function consumeSetupLink() {
  const match = location.hash.match(/^#kur=(.+)$/);
  if (!match) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const { o, r, t, p } = JSON.parse(fromBase64Url(match[1])) as SetupPayload;
    if (!o || !r || !t) return;
    useApp.getState().connect({ owner: o, repo: r, token: t });
    if (p) useApp.getState().setMe(p);
  } catch {
    // bozuk bağlantı: yok say
  }
}
