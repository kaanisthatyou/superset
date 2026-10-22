import { AnimatePresence, motion } from 'motion/react';
import { Play, Shuffle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { completeSet, rerollSong } from '../lib/actions';
import { fmtClock } from '../lib/dates';
import { timerDone } from '../lib/feedback';
import { openInSpotify, spotifyWebUrl } from '../lib/music';
import { useApp } from '../lib/store';
import { useUi } from '../lib/ui';

/** Ekranın altında duran katman: şarkı önerisi ve dinlenme/çalışma sayacı. */
export function Dock() {
  const timer = useApp((s) => s.timer);
  const song = useUi((s) => s.song);
  const lifted = useUi((s) => s.overlays.length === 0);
  const [, setNow] = useState(0);
  const [ready, setReady] = useState(false);

  // Sayaç bitişi: süre tutulan set ise işaretle (dinlenme kendiliğinden başlar), değilse haber ver.
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    const timeout = setTimeout(
      () => {
        timerDone();
        if (timer.kind === 'work' && timer.target) {
          const { dayId, exerciseId, setIdx, unit } = timer.target;
          completeSet(dayId, exerciseId, setIdx, { reps: unit === 'min' ? Math.round(timer.total / 60) : timer.total });
        } else {
          useApp.getState().clearTimer();
          setReady(true);
        }
      },
      Math.max(0, timer.endsAt - Date.now()),
    );
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [timer]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setReady(false), 3500);
    return () => clearTimeout(t);
  }, [ready]);

  // Öneri görmezden gelindiyse bir süre sonra kendiliğinden çekilsin.
  useEffect(() => {
    if (!song) return;
    const t = setTimeout(() => useUi.getState().setSong(null), 75_000);
    return () => clearTimeout(t);
  }, [song]);

  const remaining = timer ? Math.max(0, (timer.endsAt - Date.now()) / 1000) : 0;
  // Dakikalık hareketlerde (yürüyüş, bisiklet) 15 sn eklemek anlamsız: 1 dk eklenir.
  const bump = timer?.target?.unit === 'min' ? 60 : 15;

  // Süreli set erken bitirilirse yapılan kadarı kaydedilir.
  const stop = () => {
    if (timer?.kind === 'work' && timer.target) {
      const { dayId, exerciseId, setIdx, unit } = timer.target;
      const elapsed = timer.total - remaining;
      completeSet(dayId, exerciseId, setIdx, { reps: unit === 'min' ? Math.max(1, Math.round(elapsed / 60)) : Math.max(1, Math.round(elapsed)) });
    } else useApp.getState().clearTimer();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 transition-[bottom] duration-300"
      style={{ bottom: lifted ? 'calc(5.25rem + env(safe-area-inset-bottom))' : 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="flex w-full max-w-xl flex-col gap-2">
        <AnimatePresence>
          {song && (
            <motion.section
              key="song"
              layout
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="pointer-events-auto rounded-[22px] bg-paper p-2.5 shadow-[0_12px_40px_-12px_rgba(20,22,26,.45)] ring-1 ring-line"
              aria-label="Şarkı önerisi"
            >
              <div className="flex items-center gap-2 pr-0.5 pl-1.5">
                <p className="eyebrow min-w-0 flex-1 truncate text-steel">
                  <span className="text-ink">
                    <span lang="en">Spotify</span>'da dinlemek ister misin?
                  </span>
                </p>
                <button
                  onClick={() => useUi.getState().setSong(null)}
                  aria-label="Öneriyi kapat"
                  className="-my-1 grid h-9 w-9 shrink-0 place-items-center text-mist"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-3">
                {song.track.cover ? (
                  <img src={song.track.cover} alt="" className="h-13 w-13 shrink-0 rounded-[14px] object-cover" />
                ) : (
                  <span className="h-13 w-13 shrink-0 rounded-[14px] bg-ink" />
                )}
                <div className="min-w-0 flex-1">
                  <p lang="en" className="truncate font-semibold leading-tight">
                    {song.track.title}
                  </p>
                  <p lang="en" className="mt-0.5 truncate text-sm text-steel">
                    {song.track.artist}
                  </p>
                  <p lang="en" className="truncate text-xs text-mist">
                    {song.reason}
                  </p>
                </div>
                <button
                  onClick={rerollSong}
                  aria-label="Başka bir şarkı öner"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-steel ring-1 ring-line active:scale-95"
                >
                  <Shuffle size={17} />
                </button>
                <a
                  href={spotifyWebUrl(song.track)}
                  onClick={(e) => {
                    e.preventDefault();
                    openInSpotify(song.track);
                    useUi.getState().showToast('Spotify açılıyor');
                    useUi.getState().setSong(null);
                  }}
                  aria-label="Spotify'da aç"
                  className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-ink pr-5 pl-4 text-sm font-semibold text-chalk active:scale-95"
                >
                  <Play size={15} fill="currentColor" /> Aç
                </a>
              </div>
            </motion.section>
          )}

          {timer && (
            <motion.section
              key="timer"
              layout
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto relative overflow-hidden rounded-[26px] bg-ink text-chalk shadow-[0_16px_50px_-12px_rgba(20,22,26,.7)]"
              role="timer"
              aria-label={timer.kind === 'rest' ? 'Dinlenme sayacı' : 'Süre sayacı'}
            >
              <div
                className="absolute inset-y-0 left-0 bg-me opacity-90 transition-[width] duration-200 ease-linear"
                style={{ width: `${(remaining / timer.total) * 100}%` }}
              />
              <div className="relative flex items-center gap-3 py-2.5 pl-5 pr-2.5">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow opacity-80">{timer.kind === 'rest' ? 'Dinlen' : 'Devam et'}</p>
                  <p className="truncate text-sm font-medium" lang="en">
                    {timer.label}
                  </p>
                </div>
                <p className="num text-[3.25rem] tabular-nums">{fmtClock(remaining)}</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => useApp.getState().adjustTimer(bump)}
                    className="h-11 rounded-full bg-chalk/15 px-3 font-mono text-xs font-medium backdrop-blur active:scale-95"
                    aria-label={bump === 60 ? '1 dakika ekle' : '15 saniye ekle'}
                  >
                    {bump === 60 ? '+1 dk' : '+15'}
                  </button>
                  <button
                    onClick={stop}
                    className="h-11 rounded-full bg-chalk px-4 text-sm font-semibold text-ink active:scale-95"
                  >
                    {timer.kind === 'work' && timer.target ? 'Bitir' : 'Geç'}
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {ready && !timer && (
            <motion.div
              key="ready"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto rounded-[26px] bg-me px-5 py-4 text-on-me shadow-xl"
              role="status"
            >
              <p className="display text-3xl">Süre doldu. Sıradaki set.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
