import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useUi } from '../lib/ui';

interface SheetProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  /** Tam ekran (antrenman) ya da alttan açılan sayfa. */
  full?: boolean;
  footer?: ReactNode;
}

/** Alttan açılan katman. Kapatma, tarayıcı geçmişi üzerinden yapılır (geri tuşu da kapatır). */
export function Sheet({ title, eyebrow, children, full, footer }: SheetProps) {
  const close = useUi((s) => s.close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        className="absolute inset-0 bg-ink/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        className={`relative flex w-full max-w-2xl flex-col overflow-hidden bg-chalk shadow-2xl ${
          full ? 'h-dvh' : 'max-h-[92dvh] rounded-t-[28px]'
        }`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 34, stiffness: 340 }}
      >
        <header className="flex items-center gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="eyebrow text-steel">{eyebrow}</p>}
            <h2 className="display truncate text-[1.75rem]">{title}</h2>
          </div>
          <button
            onClick={close}
            aria-label="Kapat"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line active:scale-95"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </header>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer}
      </motion.div>
    </div>
  );
}
