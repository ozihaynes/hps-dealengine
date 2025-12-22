export type DealEngineThemeName = "burgundy" | "green" | "navy" | "violet" | "pink" | "black";

// Display order: Red → Green → Blue → Violet → Pink → Black
export const THEME_METADATA: Record<DealEngineThemeName, { label: string; description: string }> = {
  burgundy: {
    label: "Burgundy",
    description: "Warm, wine-toned backdrop with crisp white accents.",
  },
  green: {
    label: "Pine Green",
    description: "Calm, pine forest palette with soft green highlights.",
  },
  navy: {
    label: "Navy Blue",
    description: "Original HPS DealEngine look - deep navy with electric blue accents.",
  },
  violet: {
    label: "Violet",
    description: "Amethyst (#9966CC) accenting a deep plum base with cool lavender highlights.",
  },
  pink: {
    label: "Pink",
    description: "Bright rose (#FF83A6) highlights on a wine base with white text.",
  },
  black: {
    label: "Black",
    description: "High-contrast blacked-out dashboard with silver accents.",
  },
};

export const DEFAULT_THEME: DealEngineThemeName = "navy";
