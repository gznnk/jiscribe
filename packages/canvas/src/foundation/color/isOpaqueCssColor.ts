import { isCssColor } from "./isCssColor";
import { isTransparentColor } from "./isTransparentColor";
import { parseRgbaColor } from "./parseRgbaColor";

/**
 * Whether a CSS color string fully covers what is behind it.
 *
 * Browser-only through {@link isCssColor}: `CSS` is undefined under Node.
 *
 * @param color false for a string the browser rejects as a color (`"auto"`,
 *   `""`), for `transparent`, and for any alpha below 1 in a hex or `rgb()` /
 *   `rgba()` spelling; named colors and `hsl()` count as opaque, since
 *   {@link parseRgbaColor} does not read their alpha
 */
export const isOpaqueCssColor = (color: string): boolean =>
	isCssColor(color) &&
	!isTransparentColor(color) &&
	(parseRgbaColor(color)?.alpha ?? 1) === 1;
