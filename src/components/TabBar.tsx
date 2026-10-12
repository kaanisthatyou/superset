import { motion } from 'motion/react';
import { CalendarCheck, Dumbbell, TrendingUp } from 'lucide-react';
import { useUi, type Tab } from '../lib/ui';

const TABS: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'program', label: 'Program', icon: CalendarCheck },
  { id: 'index', label: 'Hareketler', icon: Dumbbell },
  { id: 'progress', label: 'İlerleme', icon: TrendingUp },
];

export function TabBar() {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      aria-label="Ana gezinme"
    >
      <div className="flex w-full max-w-sm gap-1 rounded-full bg-ink p-1.5 shadow-[0_14px_40px_-10px_rgba(20,22,26,.6)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[0.8rem] font-semibold transition-colors ${
                active ? 'text-on-me' : 'text-mist'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-me"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
              )}
              <Icon size={18} strokeWidth={2.4} className="relative" />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
