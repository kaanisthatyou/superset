import { create } from 'zustand';
import { getBlob, getFile, getTree, GhError, putFile, type GhConfig } from './github';
import { PROFILES_PATH, useApp, type FileEntry } from './store';
import type { BodyEntry, BodyLog, Profile, SessionLog, WeekLog } from './types';

type Status = 'local' | 'idle' | 'syncing' | 'offline' | 'error';

export const useSync = create<{ status: Status; at: number | null; error: string | null }>(() => ({
  status: 'idle',
  at: null,
  error: null,
}));

const WANTED = /^(profiles\.json|music\.json|programs\/.+\.json|logs\/.+\.json|body\/.+\.json)$/;

// ── Birleştirme ────────────────────────────────────────────────────────────
// İki cihaz aynı dosyayı değiştirdiyse veri kaybetmeden birleştir: set bazında
// en son dokunulan kazanır.

const later = <T extends { at: string }>(a: T | undefined, b: T | undefined) =>
  !a ? b! : !b ? a : b.at > a.at ? b : a;

function mergeSession(a: SessionLog, b: SessionLog): SessionLog {
  const newer = b.updatedAt > a.updatedAt ? b : a;
  const older = newer === a ? b : a;
  const out: SessionLog = { ...older, ...newer, exercises: {} };
  for (const id of new Set([...Object.keys(a.exercises), ...Object.keys(b.exercises)])) {
    const ea = a.exercises[id];
    const eb = b.exercises[id];
    if (!ea || !eb) {
      out.exercises[id] = ea ?? eb;
      continue;
    }
    const sets = Array.from({ length: Math.max(ea.sets.length, eb.sets.length) }, (_, i) =>
      later(ea.sets[i], eb.sets[i]),
    );
    out.exercises[id] = { ...ea, ...eb, sets };
  }
  return out;
}

export function mergeWeekLog(local: WeekLog, remote: WeekLog): WeekLog {
  const out: WeekLog = { ...remote, ...local, sessions: {} };
  for (const id of new Set([...Object.keys(local.sessions), ...Object.keys(remote.sessions)])) {
    const a = local.sessions[id];
    const b = remote.sessions[id];
    out.sessions[id] = a && b ? mergeSession(a, b) : (a ?? b);
  }
  out.updatedAt = local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt;
  return out;
}

function mergeBody(local: BodyLog, remote: BodyLog): BodyLog {
  const byDate = new Map<string, BodyEntry>();
  for (const e of [...remote.entries, ...local.entries]) byDate.set(e.date, later(byDate.get(e.date), e));
  return { ...remote, ...local, entries: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

function mergeFile(path: string, local: unknown, remote: unknown): unknown {
  if (path.startsWith('logs/')) return mergeWeekLog(local as WeekLog, remote as WeekLog);
  if (path.startsWith('body/')) return mergeBody(local as BodyLog, remote as BodyLog);
  if (path === PROFILES_PATH) {
    // Uygulama sadece ad ve renk değiştirir; koçun tuttuğu diğer alanlar depodaki gibi kalır.
    const mine = new Map((local as { profiles: Profile[] }).profiles.map((p) => [p.id, p]));
    const r = remote as { profiles: Profile[] };
    return {
      ...r,
      profiles: r.profiles.map((p) => {
        const l = mine.get(p.id);
        return l ? { ...p, name: l.name, color: l.color } : p;
      }),
    };
  }
  return local;
}

// ── Eşitleme ───────────────────────────────────────────────────────────────

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
    }),
  );
}

async function pull(cfg: GhConfig) {
  const tree = await getTree(cfg);
  const state = useApp.getState();
  const changed = Object.entries(tree).filter(([path, sha]) => WANTED.test(path) && state.files[path]?.sha !== sha);

  const fetched: Record<string, FileEntry> = {};
  await pool(changed, 6, async ([path, sha]) => {
    fetched[path] = { sha, data: await getBlob(cfg, sha) };
  });

  useApp.setState((s) => {
    const files = { ...s.files };
    for (const [path, entry] of Object.entries(fetched)) {
      const local = s.files[path];
      files[path] = s.dirty[path] && local ? { sha: entry.sha, data: mergeFile(path, local.data, entry.data) } : entry;
    }
    // Depodan silinen (ve bekleyen değişikliği olmayan) dosyalar yerelden de kalksın.
    for (const path of Object.keys(files)) {
      if (!tree[path] && !s.dirty[path] && files[path].sha) delete files[path];
    }
    return { files, synced: true };
  });
}

async function push(cfg: GhConfig) {
  const me = useApp.getState().me ?? 'app';
  for (const path of Object.keys(useApp.getState().dirty)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const entry = useApp.getState().files[path];
      if (!entry) break;
      try {
        const sha = await putFile(cfg, path, entry.data, entry.sha, `${me}: ${path}`);
        useApp.setState((s) => {
          const files = { ...s.files, [path]: { ...s.files[path], sha } };
          // Gönderim sürerken yeni bir set işaretlendiyse dosya kirli kalsın.
          if (s.files[path]?.data !== entry.data) return { files };
          const dirty = { ...s.dirty };
          delete dirty[path];
          return { files, dirty };
        });
        break;
      } catch (e) {
        if (!(e instanceof GhError) || (e.status !== 409 && e.status !== 422) || attempt === 2) throw e;
        // sha eskimiş: depodakini al, birleştir, yeniden dene.
        const remote = await getFile(cfg, path);
        useApp.setState((s) => ({
          files: {
            ...s.files,
            [path]: remote
              ? { sha: remote.sha, data: mergeFile(path, s.files[path].data, remote.data) }
              : { data: s.files[path].data },
          },
        }));
      }
    }
  }
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  const cfg = useApp.getState().gh;
  if (!cfg) {
    useSync.setState({ status: 'local', error: null });
    return Promise.resolve();
  }
  if (!navigator.onLine) {
    useSync.setState({ status: 'offline', error: null });
    return Promise.resolve();
  }
  useSync.setState({ status: 'syncing', error: null });
  running = (async () => {
    try {
      await pull(cfg);
      await push(cfg);
      useSync.setState({ status: 'idle', at: Date.now(), error: null });
    } catch (e) {
      const offline = e instanceof TypeError;
      useSync.setState({
        status: offline ? 'offline' : 'error',
        error: offline ? null : e instanceof GhError ? explain(e) : String(e),
      });
    } finally {
      running = null;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
}

function explain(e: GhError) {
  if (e.status === 401) return 'Anahtar geçersiz ya da süresi dolmuş. Ayarlardan yeni anahtar gir.';
  if (e.status === 403) return 'Anahtarın bu depoya yazma izni yok (Contents: Read and write gerekli).';
  if (e.status === 404) return 'Depo bulunamadı. Sahip ve depo adını kontrol et.';
  return `GitHub ${e.status}: ${e.message}`;
}

let debounce: ReturnType<typeof setTimeout> | undefined;

/** Uygulama açılışında bir kez çağrılır: otomatik eşitlemeyi kurar. */
export function startAutoSync() {
  useApp.subscribe((s, prev) => {
    if (s.dirty !== prev.dirty && Object.keys(s.dirty).length) {
      clearTimeout(debounce);
      debounce = setTimeout(() => void syncNow(), 4000);
    }
    if (s.gh !== prev.gh) void syncNow();
  });
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      // Telefon cebe girerken bekleyen setleri hemen gönder.
      if (Object.keys(useApp.getState().dirty).length) {
        clearTimeout(debounce);
        void syncNow();
      }
      return;
    }
    const { at } = useSync.getState();
    if (!at || Date.now() - at > 60_000) void syncNow();
  });
  void syncNow();
}
