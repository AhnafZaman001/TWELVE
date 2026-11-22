"use client";

import { StyledQr } from "./styled-qr";

import { QR_THEMES, type ThemeKey } from "@/lib/qr-themes";

export type Paper = "dark" | "light";

// One printable A4 card for a room: the QR (rounded square, 12 in the middle)
// and the room name under it. Sizes use container units (cqw) so the screen
// preview and the printed page look identical at any size.
export function QrCard(props: { url: string; roomCode: string; theme: ThemeKey; paper: Paper }) {
  const t = QR_THEMES[props.theme];
  const dark = props.paper === "dark";

  return (
    <article
      className="flex aspect-[210/297] w-full flex-col items-center justify-center overflow-hidden rounded-2xl print:h-[297mm] print:w-[210mm] print:rounded-none"
      style={{
        containerType: "inline-size",
        background: dark ? "#0a0a0a" : "#fafaf9",
        color: dark ? "#f5f5f4" : "#1c1917",
        gap: "8cqw",
      }}
    >
      <StyledQr text={props.url} accent={t.eye} className="w-[68cqw] drop-shadow-xl" />
      <p style={{ fontSize: "18cqw", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{props.roomCode}</p>
    </article>
  );
}
