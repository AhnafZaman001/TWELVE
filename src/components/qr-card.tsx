"use client";

import { StyledQr } from "./styled-qr";
import { TwelveDial } from "./twelve-dial";

import { QR_THEMES, type ThemeKey } from "@/lib/qr-themes";

export type Paper = "dark" | "light";

// One printable A4 card for a room. Sizes use container units (cqw) so the
// screen preview and the printed page look identical at any size.
export function QrCard(props: {
  url: string;
  roomCode: string;
  sectionName?: string;
  groupName?: string;
  rounds: { name: string; startTime: string }[];
  codeLabel: string;
  issuedOn: string;
  theme: ThemeKey;
  paper: Paper;
}) {
  const t = QR_THEMES[props.theme];
  const dark = props.paper === "dark";
  const bg = dark ? "#0a0a0a" : "#fafaf9";
  const ink = dark ? "#f5f5f4" : "#1c1917";
  const accent = dark ? t.accent : t.eye;
  const muted = dark ? "rgba(245,245,244,0.6)" : "rgba(28,25,23,0.6)";
  const cq = (n: number) => `${n}cqw`;

  return (
    <article
      className="relative flex aspect-[210/297] w-full flex-col overflow-hidden rounded-2xl print:h-[297mm] print:w-[210mm] print:rounded-none"
      style={{ containerType: "inline-size", background: bg, color: ink }}
    >
      {/* soft glow behind the dial */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "50%",
          top: "40%",
          width: cq(110),
          height: cq(110),
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${accent}${dark ? "33" : "22"} 0%, transparent 60%)`,
        }}
      />

      <header className="relative flex items-start justify-between" style={{ padding: `${cq(5.5)} ${cq(7)} 0` }}>
        <div>
          <p style={{ fontSize: cq(5.2), fontWeight: 800, letterSpacing: "0.22em", lineHeight: 1 }}>TWELVE</p>
          <p style={{ fontSize: cq(2.2), color: muted, marginTop: cq(1), letterSpacing: "0.08em" }}>
            by Keystone Labs
          </p>
        </div>
        {props.groupName && (
          <span
            style={{
              fontSize: cq(2.6),
              fontWeight: 600,
              border: `${cq(0.3)} solid ${accent}`,
              color: accent,
              borderRadius: cq(10),
              padding: `${cq(0.8)} ${cq(2.4)}`,
            }}
          >
            {props.groupName}
          </span>
        )}
      </header>

      <div className="relative flex justify-center" style={{ marginTop: cq(2.5) }}>
        <TwelveDial accent={accent} ink={ink} inner={0.52} className="w-[70cqw]">
          <StyledQr text={props.url} accent={t.eye} className="size-full drop-shadow-xl" />
        </TwelveDial>
      </div>

      <div className="relative flex flex-col items-center text-center" style={{ marginTop: cq(2) }}>
        <p style={{ fontSize: cq(3), color: muted, letterSpacing: "0.3em", fontWeight: 600 }}>ROOM</p>
        <p style={{ fontSize: cq(13), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{props.roomCode}</p>
        {props.sectionName && (
          <p style={{ fontSize: cq(5.5), fontWeight: 700, color: accent, marginTop: cq(1) }}>{props.sectionName}</p>
        )}
      </div>

      <ol className="relative flex justify-center" style={{ gap: cq(2), marginTop: cq(3), fontSize: cq(2.6) }}>
        {["Scan when your round starts", "Check every card", "Send"].map((step, i) => (
          <li key={step} className="flex items-center" style={{ gap: cq(1.2) }}>
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: cq(4.2), height: cq(4.2), background: accent, color: bg, fontWeight: 800 }}
            >
              {i + 1}
            </span>
            <span style={{ fontWeight: 600 }}>{step}</span>
          </li>
        ))}
      </ol>

      {props.rounds.length > 0 && (
        <ul
          className="relative flex flex-wrap justify-center"
          style={{ gap: `${cq(0.8)} ${cq(3)}`, marginTop: cq(2.5), fontSize: cq(2.5), color: muted }}
        >
          {props.rounds.map((r) => (
            <li key={r.name}>
              {r.name} <span style={{ color: ink, fontWeight: 700 }}>{r.startTime}</span>
            </li>
          ))}
        </ul>
      )}

      <footer
        className="relative mt-auto flex items-end justify-between"
        style={{ padding: `${cq(3)} ${cq(7)} ${cq(5)}`, fontSize: cq(2.1), color: muted }}
      >
        <span>Scan only inside this room · Do not share photos of this code</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", color: ink }}>
          #{props.codeLabel} · {props.issuedOn}
        </span>
      </footer>
    </article>
  );
}
