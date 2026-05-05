/**
 * Available stroke dash types.
 */
export const StrokeDashTypes = ["solid", "dashed", "dotted"] as const;

/**
 * Defines the available dash patterns for strokes/borders.
 */
export type StrokeDashType = (typeof StrokeDashTypes)[number];
