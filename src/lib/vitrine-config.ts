export const VITRINE_ACCENT_COLORS = ["navy", "emerald", "gold", "rose", "violet", "slate"] as const;

export type VitrineAccentColor = (typeof VITRINE_ACCENT_COLORS)[number];

export type VitrineConfig = {
  coverUrl: string;
  accentColor: VitrineAccentColor;
};

export const DEFAULT_VITRINE_CONFIG: VitrineConfig = {
  coverUrl: "",
  accentColor: "navy",
};

export const VITRINE_COLOR_VALUES: Record<VitrineAccentColor, string> = {
  navy: "var(--navy)",
  emerald: "var(--emerald)",
  gold: "var(--gold)",
  rose: "oklch(0.62 0.16 15)",
  violet: "oklch(0.45 0.16 295)",
  slate: "oklch(0.38 0.02 260)",
};

export function normalizeVitrineConfig(value: unknown, fallback: Partial<VitrineConfig> = {}): VitrineConfig {
  const input = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const coverUrl = typeof input.coverUrl === "string" ? input.coverUrl.trim() : fallback.coverUrl || "";
  const accentCandidate =
    typeof input.accentColor === "string" ? input.accentColor.trim() : fallback.accentColor || "navy";
  const accentColor = VITRINE_ACCENT_COLORS.includes(accentCandidate as VitrineAccentColor)
    ? (accentCandidate as VitrineAccentColor)
    : "navy";
  return { coverUrl, accentColor };
}
