"use client";

import QRCode from "qrcode";

// A QR drawn by hand as SVG: soft rounded dots, rounded corner "eyes" in the accent
// colour and a small "12" badge in the middle. Uses the highest error
// correction so the badge does not stop it scanning. Dark modules on a light
// tile, because that is what every phone camera reads reliably.
export function StyledQr(props: { text: string; accent: string; className?: string }) {
  const qr = QRCode.create(props.text, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const quiet = 2;
  const view = size + quiet * 2;
  const isEye = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  const badge = Math.round(size * 0.22) | 1; // odd number of modules
  const b0 = (size - badge) / 2;
  const underBadge = (r: number, c: number) => r >= b0 - 0.5 && r < b0 + badge && c >= b0 - 0.5 && c < b0 + badge;

  const dots: React.ReactNode[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!qr.modules.get(r, c) || isEye(r, c) || underBadge(r, c)) continue;
      // rounded squares: round dots this small do not scan reliably (see scripts/check-qr.mjs)
      dots.push(<rect key={`${r}-${c}`} x={c + quiet + 0.04} y={r + quiet + 0.04} width={0.92} height={0.92} rx={0.3} />);
    }
  }
  const eye = (r: number, c: number) => (
    <g key={`eye-${r}-${c}`} transform={`translate(${c + quiet} ${r + quiet})`}>
      <rect x="0.5" y="0.5" width="6" height="6" rx="1.8" fill="none" stroke={props.accent} strokeWidth="1" />
      <rect x="2" y="2" width="3" height="3" rx="0.9" fill={props.accent} />
    </g>
  );

  return (
    <svg viewBox={`0 0 ${view} ${view}`} className={props.className} role="img" aria-label="QR code">
      <rect width={view} height={view} rx={view * 0.06} fill="#fafaf9" />
      <g fill="#0c0a09">{dots}</g>
      {eye(0, 0)}
      {eye(0, size - 7)}
      {eye(size - 7, 0)}
      <g transform={`translate(${b0 + quiet} ${b0 + quiet})`}>
        <rect width={badge} height={badge} rx={badge * 0.28} fill="#0c0a09" />
        <text
          x={badge / 2}
          y={badge / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={props.accent}
          fontSize={badge * 0.52}
          fontWeight={800}
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          12
        </text>
      </g>
    </svg>
  );
}
