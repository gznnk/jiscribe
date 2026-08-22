/**
 * How a text lays itself out inside the box it is drawn in.
 *
 * - `"label"`: the box is the text's own extent — lines break at authored
 *   newlines and nowhere else, and the width follows the longest line.
 * - `"block"`: the box has a stored width the text wraps in, and the height is
 *   measured from the wrapped lines, so the text grows downward from the
 *   top-left corner the doc stores.
 */
export const TextLayouts = ["label", "block"] as const;

/** Layout mode of a text (see {@link TextLayouts}). */
export type TextLayout = (typeof TextLayouts)[number];

/**
 * Type guard for {@link TextLayout}.
 *
 * @param value - The value to check; anything but one of the two mode names is false, `undefined` included (an absent mode is the caller's to read as "label")
 * @returns True if the value is a valid TextLayout
 */
export const isTextLayout = (value: unknown): value is TextLayout =>
	TextLayouts.includes(value as TextLayout);
