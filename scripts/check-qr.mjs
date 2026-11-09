// Checks that the styled QR on the room cards still scans: draws it the same
// way as src/components/styled-qr.tsx (round dots, rounded eyes, centre badge)
// into a bitmap and decodes it. Run: node scripts/check-qr.mjs
import QRCode from "qrcode";
import jsQR from "jsqr";

function render(text, px = 8) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const size = qr.modules.size, quiet = 2, view = size + quiet * 2, W = view * px;
  const img = new Uint8ClampedArray(W * W * 4).fill(250); // light tile
  const set = (x, y, v) => { const i = (y * W + x) * 4; img[i] = img[i + 1] = img[i + 2] = v; img[i + 3] = 255; };
  const fill = (test, v) => { for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (test((x + 0.5) / px, (y + 0.5) / px)) set(x, y, v); };
  for (let i = 3; i < img.length; i += 4) img[i] = 255;
  const isEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  const badge = Math.round(size * 0.22) | 1, b0 = (size - badge) / 2;
  const underBadge = (r, c) => r >= b0 - 0.5 && r < b0 + badge && c >= b0 - 0.5 && c < b0 + badge;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!qr.modules.get(r, c) || isEye(r, c) || underBadge(r, c)) continue;
    // rounded square: 0.92 module wide, corner radius 0.3
    const x0 = c + quiet + 0.04, y0 = r + quiet + 0.04, w = 0.92, rr = 0.3;
    fill((x, y) => {
      const u = x - x0, v = y - y0;
      if (u < 0 || v < 0 || u > w || v > w) return false;
      const dx = Math.max(rr - u, 0, u - (w - rr)), dy = Math.max(rr - v, 0, v - (w - rr));
      return dx * dx + dy * dy <= rr * rr;
    }, 12);
  }
  for (const [r, c] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    const ox = c + quiet, oy = r + quiet;
    // ring 1 module thick (accent, dark enough) + 3x3 centre
    fill((x, y) => { const u = x - ox, v = y - oy; const out = u >= 0 && u <= 7 && v >= 0 && v <= 7; const inn = u > 1 && u < 6 && v > 1 && v < 6; return out && !inn; }, 70);
    fill((x, y) => { const u = x - ox, v = y - oy; return u >= 2 && u <= 5 && v >= 2 && v <= 5; }, 70);
  }
  fill((x, y) => x >= b0 + quiet && x < b0 + quiet + badge && y >= b0 + quiet && y < b0 + quiet + badge, 12);
  return { data: img, width: W, height: W };
}

// real-length links on every host the app may run on, with random tokens
const hosts = ["https://twelve.keystonelabs.site", "http://localhost:3000", "http://192.168.1.20:3000"];
const token = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
let failed = 0;
for (const text of hosts.flatMap((h) => Array.from({ length: 10 }, () => `${h}/r/${token()}`))) {
  const { data, width, height } = render(text, 6 + (failed % 3));
  const out = jsQR(data, width, height);
  const ok = out?.data === text;
  if (!ok) failed++;
  console.log(ok ? "OK  " : "FAIL", text);
}
process.exit(failed ? 1 : 0);
