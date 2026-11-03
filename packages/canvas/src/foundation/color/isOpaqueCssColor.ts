import { normalizeCssColor } from "./normalizeCssColor";
import { parseRgbaColor } from "./parseRgbaColor";

/**
 * Whether a CSS color string fully covers what is behind it.
 *
 * Browser-only through {@link normalizeCssColor}: it needs a canvas.
 *
 * @param color true only when the browser resolves it to a hex or `rgb()` /
 *   `rgba()` spelling with alpha 1. False for anything else: a string the
 *   browser rejects (`"auto"`, `""`), `transparent`, an alpha below 1 in any
 *   spelling (`hsl(... / 0.5)` included), `var(...)` and `currentColor`, and a
 *   color the browser keeps in a space {@link parseRgbaColor} cannot read
 *   (`oklch()`, `color-mix()`), opaque or not
 */
export const isOpaqueCssColor = (color: string): boolean => {
	const normalized = normalizeCssColor(color);
	return normalized !== null && parseRgbaColor(normalized)?.alpha === 1;
};
