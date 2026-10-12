import type { CSSProperties, ReactNode } from 'react';

interface PlateProps {
  /** 0–1: plakanın ne kadarı dolu (set tamamsa 1). */
  fill?: number;
  color?: string;
  onColor?: string;
  size?: number;
  /** Henüz planlanmamış / boş gün: kesik çizgili çember. */
  ghost?: boolean;
  /** Sıradaki set: kalın mürekkep çerçeve. */
  active?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Uygulamanın ana motifi: önden görülen ağırlık plakası.
 * Bir set, bir gün, bir kişi — hepsi birer plaka.
 */
export function Plate({
  fill = 0,
  color = 'var(--me)',
  onColor = 'var(--on-me)',
  size = 56,
  ghost,
  active,
  children,
  className = '',
  style,
}: PlateProps) {
  const full = fill >= 1;
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size, color: full ? onColor : 'var(--color-ink)', ...style }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="47"
          fill={full ? color : 'var(--color-paper)'}
          stroke={full ? color : active ? 'var(--color-ink)' : 'var(--color-line)'}
          strokeWidth={active && !full ? 5 : 3}
          strokeDasharray={ghost ? '3 7' : undefined}
          strokeLinecap="round"
        />
        {!full && fill > 0 && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${c * fill} ${c}`}
            transform="rotate(-90 50 50)"
          />
        )}
        {/* plakanın iç dudağı */}
        {!ghost && (
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke={full ? onColor : 'var(--color-line)'}
            strokeOpacity={full ? 0.28 : 0.7}
            strokeWidth="1.5"
          />
        )}
      </svg>
      <span className="relative leading-none">{children}</span>
    </span>
  );
}
