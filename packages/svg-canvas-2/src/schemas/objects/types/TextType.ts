/**
 * Available text display types.
 */
export const TextTypes = ["text", "textarea", "markdown"] as const;

/**
 * Defines how text content should be displayed.
 * - `text`: Single-line text without wrapping
 * - `textarea`: Multi-line text with wrapping
 * - `markdown`: Markdown-formatted text rendered as HTML
 */
export type TextType = (typeof TextTypes)[number];
