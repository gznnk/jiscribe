/**
 * Available vertical text alignment options.
 */
export const VerticalAligns = ["top", "middle", "bottom"] as const;

/**
 * Defines vertical text alignment within a shape.
 */
export type VerticalAlign = (typeof VerticalAligns)[number];

/**
 * Type guard to check if a value is a valid VerticalAlign.
 *
 * @param value - The value to check
 * @returns True if the value is a valid VerticalAlign, false otherwise
 */
export const isVerticalAlign = (value: unknown): value is VerticalAlign => {
	return VerticalAligns.includes(value as VerticalAlign);
};
