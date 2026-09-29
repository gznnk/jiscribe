/**
 * Available horizontal text alignment options.
 */
export const TextAligns = ["left", "center", "right"] as const;

/**
 * Defines horizontal text alignment within a shape.
 */
export type TextAlign = (typeof TextAligns)[number];

/**
 * Type guard to check if a value is a valid TextAlign.
 *
 * @param value - The value to check
 * @returns True if the value is a valid TextAlign, false otherwise
 */
export const isTextAlign = (value: unknown): value is TextAlign => {
	return TextAligns.includes(value as TextAlign);
};
