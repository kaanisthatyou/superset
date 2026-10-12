// Vücut haritası çokgenleri: react-body-highlighter (MIT, © Gian Marco Toso) projesinden alınmıştır.
import map from '../data/bodymap.json';

interface BodyMapProps {
  /** Ana hedef bölgeler (harita anahtarlarıyla) */
  primary?: string[];
  /** Yardımcı bölgeler */
  secondary?: string[];
  onPick?: (muscle: string) => void;
  className?: string;
}

const IGNORED = new Set(['head', 'knees']);

function Side({
  data,
  label,
  primary,
  secondary,
  onPick,
}: {
  data: { muscle: string; points: string[] }[];
  label: string;
  primary: Set<string>;
  secondary: Set<string>;
  onPick?: (muscle: string) => void;
}) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <svg viewBox="0 0 100 200" className="h-full w-full" role="img" aria-label={`Vücut haritası, ${label}`}>
        {data.flatMap(({ muscle, points }) =>
          points.map((p, i) => {
            const pickable = !!onPick && !IGNORED.has(muscle);
            return (
              <polygon
                key={`${muscle}-${i}`}
                points={p}
                onClick={pickable ? () => onPick(muscle) : undefined}
                className={pickable ? 'cursor-pointer transition-[fill,opacity] duration-150 hover:opacity-70' : undefined}
                fill={
                  primary.has(muscle)
                    ? 'var(--me)'
                    : secondary.has(muscle)
                      ? 'color-mix(in oklab, var(--me) 38%, var(--color-chalk))'
                      : IGNORED.has(muscle)
                        ? 'var(--color-line)'
                        : '#c3c8cf'
                }
              />
            );
          }),
        )}
      </svg>
      <figcaption className="eyebrow text-steel">{label}</figcaption>
    </figure>
  );
}

export function BodyMap({ primary = [], secondary = [], onPick, className = '' }: BodyMapProps) {
  const p = new Set(primary);
  const s = new Set(secondary);
  return (
    <div className={`flex items-stretch justify-center gap-3 ${className}`}>
      <Side data={map.front} label="Ön" primary={p} secondary={s} onPick={onPick} />
      <Side data={map.back} label="Arka" primary={p} secondary={s} onPick={onPick} />
    </div>
  );
}
