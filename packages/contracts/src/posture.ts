export const Postures = ["conservative", "base", "aggressive"] as const;
export type Posture = typeof Postures[number];