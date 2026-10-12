import { useEffect, useRef, useState } from 'react';
import { gifUrl } from '../lib/exercises';

interface GifProps {
  id: string;
  alt: string;
  className?: string;
  /** Liste içinde: yalnızca ekrana yaklaşınca yükle, uzaklaşınca bırak. */
  lazy?: boolean;
}

/**
 * Hareketin kas vurgulu animasyonu. Listelerde yüzlerce GIF aynı anda oynamasın diye
 * görünür alana girince yüklenir, çıkınca kaldırılır.
 */
export function Gif({ id, alt, className = '', lazy = true }: GifProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!lazy || !ref.current) return;
    const io = new IntersectionObserver((entries) => setVisible(entries[entries.length - 1].isIntersecting), {
      rootMargin: '300px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [lazy]);

  return (
    <div ref={ref} className={`grid place-items-center overflow-hidden ${className}`}>
      {visible && !failed ? (
        <img
          src={gifUrl(id)}
          alt={alt}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="gif-blend h-full w-full object-contain"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="h-1/2 w-1/2 text-line" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="4 9" />
          <circle cx="50" cy="50" r="10" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}
