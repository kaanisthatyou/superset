// Özel veri deposuyla konuşan ince katman. Uygulamanın sunucusu yok:
// tarayıcı, kullanıcının girdiği anahtarla doğrudan GitHub API'sini çağırır.

export interface GhConfig {
  owner: string;
  repo: string;
  token: string;
}

export class GhError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const BRANCH = 'main';

async function call<T>(cfg: GhConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      // gövde JSON değilse durum metni yeter
    }
    throw new GhError(res.status, message);
  }
  return res.json() as Promise<T>;
}

const encode = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

const decode = (b64: string) => {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** Depodaki tüm dosyalar: yol → blob sha. Tek istek. */
export async function getTree(cfg: GhConfig): Promise<Record<string, string>> {
  try {
    const res = await call<{ tree: { path: string; type: string; sha: string }[] }>(
      cfg,
      `/git/trees/${BRANCH}?recursive=1`,
    );
    return Object.fromEntries(res.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));
  } catch (e) {
    // Boş depo (henüz commit yok) → dosya yok say.
    if (e instanceof GhError && (e.status === 409 || e.status === 404)) {
      await call(cfg, ''); // depo gerçekten yoksa ya da anahtar yetkisizse burada patlar
      return {};
    }
    throw e;
  }
}

export async function getBlob(cfg: GhConfig, sha: string): Promise<unknown> {
  const res = await call<{ content: string }>(cfg, `/git/blobs/${sha}`);
  return JSON.parse(decode(res.content));
}

export async function getFile(cfg: GhConfig, path: string): Promise<{ sha: string; data: unknown } | null> {
  try {
    const res = await call<{ sha: string; content: string }>(
      cfg,
      `/contents/${encodeURI(path)}?ref=${BRANCH}`,
    );
    return { sha: res.sha, data: JSON.parse(decode(res.content)) };
  } catch (e) {
    if (e instanceof GhError && e.status === 404) return null;
    throw e;
  }
}

/** Dosyayı yazar, yeni sha'yı döndürür. sha eskiyse GitHub 409/422 verir. */
export async function putFile(
  cfg: GhConfig,
  path: string,
  data: unknown,
  sha: string | undefined,
  message: string,
): Promise<string> {
  const res = await call<{ content: { sha: string } }>(cfg, `/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encode(JSON.stringify(data, null, 2) + '\n'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  return res.content.sha;
}
