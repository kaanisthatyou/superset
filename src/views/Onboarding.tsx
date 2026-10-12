import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Plate } from '../components/Plate';
import { useProfiles } from '../lib/domain';
import { PLATES } from '../lib/labels';
import { useApp } from '../lib/store';

/** İlk açılış: bu cihaz kimin? */
export function Onboarding() {
  const profiles = useProfiles();
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState('');
  const profile = profiles.find((p) => p.id === picked);

  const start = () => {
    if (!profile) return;
    const app = useApp.getState();
    if (name.trim() && name.trim() !== profile.name) app.updateProfile(profile.id, { name: name.trim() });
    app.setMe(profile.id);
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
        <p className="mt-5 max-w-sm text-lg leading-snug text-steel">
          Haftalık programın, set set işaretlediğin antrenmanların ve kilonun tek yeri. Önce: bu cihaz kimin?
        </p>
      </motion.div>

      <div className="mt-10">
        <div className="flex gap-3">
          {profiles.map((p, i) => {
            const c = PLATES[p.color];
            const active = picked === p.id;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.08, type: 'spring', damping: 16 }}
                onClick={() => {
                  setPicked(p.id);
                  setName(p.name);
                }}
                aria-pressed={active}
                className={`flex flex-1 flex-col items-center gap-3 rounded-[28px] p-5 ring-1 transition-colors ${
                  active ? 'bg-paper ring-2 ring-ink' : 'ring-line'
                }`}
              >
                <Plate size={96} fill={1} color={c.bg} onColor={c.on}>
                  <span className="num text-5xl">{p.name.slice(0, 1).toLocaleUpperCase('tr')}</span>
                </Plate>
                <span className="display text-2xl">{p.name}</span>
              </motion.button>
            );
          })}
        </div>

        {profile && (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <label className="block">
              <span className="eyebrow text-steel">Adın</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-14 w-full rounded-2xl bg-paper px-4 text-lg ring-1 ring-line outline-none focus:ring-2 focus:ring-ink"
              />
            </label>
            <button
              type="submit"
              className="mt-4 flex h-16 w-full items-center justify-between rounded-full pl-7 pr-2 active:scale-[0.985]"
              style={{ background: PLATES[profile.color].bg, color: PLATES[profile.color].on }}
            >
              <span className="display text-[1.7rem]">Başla</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink/20">
                <ArrowRight size={22} strokeWidth={2.75} />
              </span>
            </button>
          </motion.form>
        )}
      </div>
    </main>
  );
}
