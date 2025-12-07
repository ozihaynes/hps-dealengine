export type DealEngineThemeName = "navy" | "burgundy" | "green" | "black" | "white";

export const THEME_METADATA: Record<DealEngineThemeName, { label: string; description: string }> = {
  navy: {
    label: "Navy Blue",
    description: "Original HPS DealEngine look – deep navy with electric blue accents.",
  },
  burgundy: {
    label: "Burgundy",
    description: "Warm, wine-toned backdrop with crisp white accents.",
  },
  green: {
    label: "Pine Green",
    description: "Calm, pine forest palette with soft green highlights.",
  },
  black: {
    label: "Black",
    description: "High-contrast blacked-out dashboard with silver accents.",
  },
  white: {
    label: "White",
    description: "Light mode with subtle dark gray accents.",
  },
};

export const DEFAULT_THEME: DealEngineThemeName = "navy";
