import { parseRgbaColor } from "./parseRgbaColor";

/**
 * Whether a CSS color string paints nothing: empty, the `transparent` keyword
 * (any case), or a color whose alpha is 0 or below, whatever its RGB channels.
 *
 * @param color read as {@link parseRgbaColor} reads it; a form it cannot read
 *   (`hsla()`, named colors, `var(...)`) counts as not transparent
 */
export const isTransparentColor = (color: string): boolean => {
	const trimmed = color.trim();
	if (trimmed === "" || trimmed.toLowerCase() === "transparent") {
		return true;
	}
	return parseRgbaColor(trimmed)?.alpha === 0;
};
