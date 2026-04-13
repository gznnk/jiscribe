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

/**
 * Type guard to check if a value is a valid TextType.
 *
 * @param value - The value to check
 * @returns True if the value is a valid TextType, false otherwise
 */
export const isTextType = (value: unknown): value is TextType => {
	return TextTypes.includes(value as TextType);
};
