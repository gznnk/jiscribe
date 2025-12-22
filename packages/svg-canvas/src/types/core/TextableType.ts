/**
 * Available textable type values.
 */
export const TextableTypes = ["text", "textarea", "markdown"] as const;

/**
 * Defines the available types for text display components.
 * Used to determine the rendering behavior for text content.
 */
export type TextableType = (typeof TextableTypes)[number];
