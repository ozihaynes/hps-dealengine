export type DealEngineThemeName = "burgundy" | "green" | "navy" | "pink" | "black";

// Display order: Red → Green → Blue → Pink → Black
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
