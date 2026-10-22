import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { syncNow, useSync } from './lib/sync';
import { Dock } from './components/Dock';
import { TabBar } from './components/TabBar';
import { useMe, usePartner } from './lib/domain';
import { PLATES } from './lib/labels';
import { useApp } from './lib/store';
import { useUi } from './lib/ui';
import { ExerciseSheet } from './views/ExerciseSheet';
import { IndexView } from './views/IndexView';
import { Onboarding } from './views/Onboarding';
import { ProgramView } from './views/ProgramView';
import { ProgressView } from './views/ProgressView';
import { SessionView } from './views/SessionView';
import { SettingsSheet } from './views/SettingsSheet';

export default function App() {
  const meId = useApp((s) => s.me);
  const me = useMe();
  const partner = usePartner();
  const tab = useUi((s) => s.tab);
  const overlays = useUi((s) => s.overlays);
  const toast = useUi((s) => s.toast);
  const waiting = useApp((s) => !!s.gh && !s.synced);

  // Arayüzün vurgu rengi, cihazın sahibinin plakası.
  useEffect(() => {
    const root = document.documentElement.style;
    const mine = PLATES[me?.color ?? 'blue'];
    const theirs = PLATES[partner?.color ?? 'red'];
    root.setProperty('--me', mine.bg);
    root.setProperty('--on-me', mine.on);
    root.setProperty('--you', theirs.bg);
    root.setProperty('--on-you', theirs.on);
  }, [me?.color, partner?.color]);

  // Depoya bağlı ama henüz çekilmedi: başlangıç profilleri (başka bir çiftin) görünmesin.
  if (waiting) {
    return (
      <MotionConfig reducedMotion="user">
        <Loading />
      </MotionConfig>
    );
  }

  if (!meId || !me) {
    return (
      <MotionConfig reducedMotion="user">
        <Onboarding />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`mx-auto px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-36 ${
          tab === 'index' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
        {tab === 'program' && <ProgramView />}
        {tab === 'index' && <IndexView />}
        {tab === 'progress' && <ProgressView />}
      </main>

      <TabBar />

      <AnimatePresence>
        {overlays.map((o, i) =>
          o.type === 'session' ? (
            <SessionView key={`session-${i}`} dayId={o.dayId} />
          ) : o.type === 'exercise' ? (
            <ExerciseSheet key={`exercise-${i}`} id={o.id} tip={o.tip} />
          ) : (
            <SettingsSheet key={`settings-${i}`} />
          ),
        )}
      </AnimatePresence>

      <Dock />

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast}
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-[max(env(safe-area-inset-top),1rem)] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-medium whitespace-nowrap text-chalk shadow-xl"
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function Loading() {
  const { status, error } = useSync();
  const stuck = status === 'error' || status === 'offline';
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
      <p className="eyebrow text-steel">Süperset</p>
      <h1 className="display mt-3 text-6xl">{stuck ? 'Bağlanamadı' : 'Defter açılıyor'}</h1>
      <p className="mt-4 max-w-sm text-steel">
        {status === 'offline' ? 'İnternet yok gibi görünüyor.' : stuck ? error : 'Programınız depodan çekiliyor…'}
      </p>
      {stuck && (
        <div className="mt-6 flex gap-2">
          <button onClick={() => void syncNow()} className="h-12 rounded-full bg-ink px-6 font-semibold text-chalk active:scale-95">
            Tekrar dene
          </button>
          <button
            onClick={() => useApp.getState().connect(null)}
            className="h-12 rounded-full px-6 font-medium text-steel ring-1 ring-line active:scale-95"
          >
            Depoyu bırak
          </button>
        </div>
      )}
    </main>
  );
}
