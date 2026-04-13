/**
 * Available horizontal text alignment options.
 */
export const TextAligns = ["left", "center", "right"] as const;

/**
 * Defines horizontal text alignment within a shape.
 */
export type TextAlign = (typeof TextAligns)[number];
