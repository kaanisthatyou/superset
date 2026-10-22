// Siteyi yabancılara kapatan şifre kapısı. Şifrenin kendisi hiçbir yerde yok: yayınlanırken GitHub secret'ından
// (APP_PASSWORD) türetilen PBKDF2 özeti gömülür (vite.config.ts); doğru şifreyi giren cihaz bunu hatırlar.
// Kayıtları koruyan asıl şey yine özel depo ve anahtar; bu kapı uygulamanın kendisini gizler.

declare const __LOCK__: { salt: string; iterations: number; hash: string } | null;

const KEY = 'superset-kilit';

export function isUnlocked(): boolean {
  if (!__LOCK__) return true;
  try {
    return localStorage.getItem(KEY) === __LOCK__.hash;
  } catch {
    return false;
  }
}

/** Kurulum bağlantısına konan anahtar: bağlantıyla gelen cihaz şifre sormadan açılır. */
export const lockKey = () => __LOCK__?.hash;

/** Kurulum bağlantısıyla gelen anahtar doğruysa kapıyı açar. */
export function unlockWithKey(key: string | undefined) {
  if (!__LOCK__ || key !== __LOCK__.hash) return;
  try {
    localStorage.setItem(KEY, key);
  } catch {
    // özel pencerede hatırlanmaz
  }
}

export async function unlock(password: string): Promise<boolean> {
  if (!__LOCK__) return true;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC').trim()), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(__LOCK__.salt), iterations: __LOCK__.iterations },
    key,
    256,
  );
  const hash = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== __LOCK__.hash) return false;
  try {
    localStorage.setItem(KEY, hash);
  } catch {
    // özel pencerede hatırlanmaz; bir sonraki açılışta yine sorulur
  }
  return true;
}
