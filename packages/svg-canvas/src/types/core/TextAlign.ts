/**
 * Available text alignment values.
 */
export const TextAlignValues = ["left", "center", "right"] as const;

/**
 * Defines the horizontal alignment options for text elements.
 * Controls how text is positioned relative to its container.
 */
export type TextAlign = (typeof TextAlignValues)[number];
