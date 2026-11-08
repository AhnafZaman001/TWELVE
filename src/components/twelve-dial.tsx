// The TWELVE mark: a clock dial with the numbers 1 to 12, twelve highlighted.
// Anything passed as children sits in the middle of the dial.

const NUMERALS = Array.from({ length: 12 }, (_, i) => i + 1);

export function TwelveDial(props: {
  accent: string;
  ink: string; // numerals and ticks
  className?: string;
  children?: React.ReactNode;
  inner?: number; // size of the centre area as a fraction of the dial (default 0.5)
}) {
  const inner = props.inner ?? 0.5;
  return (
    <div className={`relative aspect-square ${props.className ?? ""}`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="100" cy="100" r="97" fill="none" stroke={props.ink} strokeOpacity="0.25" strokeWidth="0.6" />
        {Array.from({ length: 60 }, (_, i) => {
          const hour = i % 5 === 0;
          const a = (i / 60) * Math.PI * 2;
          const r1 = hour ? 89 : 92;
          return (
            <line
              key={i}
              x1={100 + Math.sin(a) * r1}
              y1={100 - Math.cos(a) * r1}
              x2={100 + Math.sin(a) * 95}
              y2={100 - Math.cos(a) * 95}
              stroke={i === 0 ? props.accent : props.ink}
              strokeOpacity={i === 0 ? 1 : hour ? 0.7 : 0.3}
              strokeWidth={hour ? 1.4 : 0.6}
              strokeLinecap="round"
            />
          );
        })}
        {NUMERALS.map((n) => {
          const a = (n / 12) * Math.PI * 2;
          const twelve = n === 12;
          return (
            <text
              key={n}
              x={100 + Math.sin(a) * 79}
              y={100 - Math.cos(a) * 79}
              textAnchor="middle"
              dominantBaseline="central"
              fill={twelve ? props.accent : props.ink}
              fillOpacity={twelve ? 1 : 0.75}
              fontSize={twelve ? 13 : 9}
              fontWeight={twelve ? 700 : 500}
              style={{ fontFamily: "var(--font-sans), system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}
            >
              {n}
            </text>
          );
        })}
      </svg>
      {props.children && (
        <div
          className="absolute flex items-center justify-center"
          style={{ inset: `${((1 - inner) / 2) * 100}%` }}
        >
          {props.children}
        </div>
      )}
    </div>
  );
}
