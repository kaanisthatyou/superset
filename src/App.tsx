import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect } from 'react';
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
