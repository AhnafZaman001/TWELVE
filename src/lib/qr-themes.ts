// Colour themes for printed QR room cards. Each group picks one (Admin → Groups).
export const QR_THEMES = {
  midnight: { name: "Midnight", accent: "#34d399", eye: "#047857" },
  ember: { name: "Ember", accent: "#fbbf24", eye: "#b45309" },
  ice: { name: "Ice", accent: "#38bdf8", eye: "#0369a1" },
  rose: { name: "Rose", accent: "#fb7185", eye: "#be123c" },
} as const;
export type ThemeKey = keyof typeof QR_THEMES;
export const THEME_KEYS = Object.keys(QR_THEMES) as ThemeKey[];
