/**
 * Available vertical alignment values.
 */
export const VerticalAlignValues = ["start", "center", "end"] as const;

/**
 * Defines the vertical alignment options for text elements.
 * Controls how text is positioned relative to its container's height.
 */
export type VerticalAlign = (typeof VerticalAlignValues)[number];
