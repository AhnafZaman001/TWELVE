"use client";

import { StyledQr } from "./styled-qr";

import { QR_THEMES, type ThemeKey } from "@/lib/qr-themes";

export type Paper = "dark" | "light";

// One card for a room (a quarter of an A4 sheet when printed): the QR (rounded square, 12 in the middle)
// and the room name under it. Sizes use container units (cqw) so the screen
// preview and the printed page look identical at any size.
export function QrCard(props: { url: string; roomCode: string; theme: ThemeKey; paper: Paper }) {
  const t = QR_THEMES[props.theme];
  const dark = props.paper === "dark";

  return (
    <article
      className="flex aspect-[210/297] w-full flex-col items-center justify-center overflow-hidden rounded-2xl print:h-[148.5mm] print:w-[105mm] print:rounded-none"
      style={{
        containerType: "inline-size",
        background: dark ? "#0a0a0a" : "#fafaf9",
        color: dark ? "#f5f5f4" : "#1c1917",
        gap: "7cqw",
        outline: "0.2mm solid rgba(128,128,128,0.45)", // a thin cutting guide between the four cards
        outlineOffset: "-0.2mm",
      }}
    >
      <StyledQr text={props.url} accent={t.eye} className="w-[48cqw] drop-shadow-xl" />
      <p style={{ fontSize: "15cqw", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{props.roomCode}</p>
    </article>
  );
}
