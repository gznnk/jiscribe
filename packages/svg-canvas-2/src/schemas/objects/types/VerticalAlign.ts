/**
 * Available vertical text alignment options.
 */
export const VerticalAligns = ["start", "center", "end"] as const;

/**
 * Defines vertical text alignment within a shape.
 */
export type VerticalAlign = (typeof VerticalAligns)[number];
