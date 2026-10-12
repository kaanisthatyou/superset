import { create } from 'zustand';
import type { Track, Vibe } from './types';

export type Tab = 'program' | 'index' | 'progress';

export type Overlay =
  | { type: 'session'; dayId: string }
  | { type: 'exercise'; id: string; tip?: string }
  | { type: 'settings' };

interface UiState {
  tab: Tab;
  overlays: Overlay[];
  /** Hareketler sekmesindeki seçim */
  filter: { part: string | null; target: string | null };
  /** "Bunu dinlemek ister misin?" kartı */
  song: { track: Track; reason: string; vibe: Vibe } | null;
  toast: string | null;

  setTab: (tab: Tab) => void;
  open: (overlay: Overlay) => void;
  close: () => void;
  setFilter: (filter: Partial<UiState['filter']>) => void;
  setSong: (song: UiState['song']) => void;
  showToast: (text: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  tab: 'program',
  overlays: [],
  filter: { part: null, target: null },
  song: null,
  toast: null,

  setTab: (tab) => {
    set({ tab });
    window.scrollTo({ top: 0 });
  },
  // Her açılan katman tarayıcı geçmişine bir adım ekler: telefonun geri tuşu
  // uygulamayı kapatmak yerine katmanı kapatır.
  open: (overlay) => {
    history.pushState({ overlay: true }, '');
    set((s) => ({ overlays: [...s.overlays, overlay] }));
  },
  close: () => history.back(),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  setSong: (song) => set({ song }),
  showToast: (text) => {
    clearTimeout(toastTimer);
    set({ toast: text });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },
}));

window.addEventListener('popstate', () => {
  useUi.setState((s) => ({ overlays: s.overlays.slice(0, -1) }));
});
