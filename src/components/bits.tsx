import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

/** − değer + : terli parmakla da tutturulacak kadar büyük. Değere dokununca klavyeyle yazılır. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  placeholder = '–',
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  placeholder?: string;
}) {
  const bump = (dir: 1 | -1) => {
    const next = Math.max(min, Math.round(((value ?? 0) + dir * step) * 100) / 100);
    onChange(next);
  };
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="eyebrow text-steel">{label}</span>
      <span className="flex items-center rounded-2xl bg-chalk ring-1 ring-line">
        <button
          type="button"
          onClick={() => bump(-1)}
          aria-label={`${label} azalt`}
          className="grid h-14 w-11 shrink-0 place-items-center text-steel active:scale-90"
        >
          <Minus size={18} strokeWidth={2.75} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(min, Number(e.target.value)))}
          onFocus={(e) => e.target.select()}
          className="num h-14 w-full min-w-0 bg-transparent text-center text-[2rem] outline-none placeholder:text-mist"
        />
        <button
          type="button"
          onClick={() => bump(1)}
          aria-label={`${label} artır`}
          className="grid h-14 w-11 shrink-0 place-items-center text-steel active:scale-90"
        >
          <Plus size={18} strokeWidth={2.75} />
        </button>
      </span>
    </label>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-steel">{hint}</span>}
      </span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-me' : 'bg-line'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-paper shadow transition-[left] duration-200 ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </span>
    </button>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="display text-[1.6rem]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[24px] bg-paper p-4 ring-1 ring-line/70 ${className}`}>{children}</div>;
}

/** Küçük çizgi grafik: tek seri, son nokta vurgulu. */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  color = 'var(--me)',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="3.5" fill={color} stroke="var(--color-paper)" strokeWidth="2" />
    </svg>
  );
}
