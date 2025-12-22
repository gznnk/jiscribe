/**
 * Available stroke dash types.
 */
export const StrokeDashTypes = ["solid", "dashed", "dotted"] as const;

/**
 * Types of stroke dash patterns for lines.
 */
export type StrokeDashType = (typeof StrokeDashTypes)[number];
