import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { unlock } from '../lib/lock';

/** Site şifresi: doğru girilene kadar uygulamanın hiçbir yeri görünmez. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    const ok = await unlock(password);
    setBusy(false);
    if (ok) return onUnlock();
    setWrong(true);
    setPassword('');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}>
        <p className="eyebrow text-steel">İki kişilik antrenman defteri</p>
        <h1 className="display mt-3 text-[clamp(4.5rem,24vw,9rem)]">
          Süper
          <br />
          set
        </h1>
        <p className="mt-5 max-w-sm text-lg leading-snug text-steel">Bu defter özel. Devam etmek için şifreyi gir.</p>
      </motion.div>

      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block">
          <span className="eyebrow text-steel">Şifre</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setWrong(false);
            }}
            aria-invalid={wrong}
            aria-describedby="kilit-hata"
            className={`mt-1.5 h-14 w-full rounded-2xl bg-paper px-4 text-lg outline-none focus:ring-2 ${
              wrong ? 'ring-2 ring-plate-red focus:ring-plate-red' : 'ring-1 ring-line focus:ring-ink'
            }`}
          />
        </label>
        <p id="kilit-hata" role="alert" className="mt-2 min-h-5 text-sm font-medium">
          {wrong && 'Şifre yanlış, tekrar dene.'}
        </p>
        <button
          type="submit"
          disabled={!password || busy}
          className="mt-2 flex h-16 w-full items-center justify-between rounded-full bg-ink pl-7 pr-2 text-chalk active:scale-[0.985] disabled:opacity-40"
        >
          <span className="display text-[1.7rem]">{busy ? 'Açılıyor…' : 'Aç'}</span>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-chalk/15">
            <ArrowRight size={22} strokeWidth={2.75} />
          </span>
        </button>
      </form>
    </main>
  );
}
