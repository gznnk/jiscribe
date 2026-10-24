import { parseRgbaColor } from "../../../color/parseRgbaColor";

/**
 * Fraction the surface color is nudged toward the contrasting luminance pole to
 * make the grid line. A small step keeps the grid subtle and in the surface's
 * hue family (a slight tonal step from the background). Tune here once a settings
 * UI exists.
 */
const GRID_LINE_MIX = 0.14;

/**
 * Derives a grid line color from the canvas surface color, so the grid stays a
 * subtle, readable step against any background (light or dark). The line is the
 * background moved toward the contrasting luminance pole by {@link GRID_LINE_MIX},
 * which keeps it tonal instead of a foreign gray. This is the single source of
 * the grid color — there is no separate theme token for it.
 *
 * @param background effective surface color (callers pass the DOM-resolved
 *   `getComputedStyle(...).backgroundColor`), read as {@link parseRgbaColor}
 *   reads it
 * @returns a `#rrggbb` line color, or `null` when `background` cannot be parsed
 *   or is fully transparent (no surface to derive from) — the caller then leaves
 *   the grid line unset
 */
export const deriveGridLineColor = (background: string): string | null => {
	const rgb = parseRgbaColor(background);
	if (rgb === null || rgb.alpha === 0) {
		return null;
	}
	// Raw sRGB luma (YIQ weights): matches the intuitive "is this a light or dark
	// color" judgment used for black-vs-white contrast decisions.
	const luma = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	const pole = luma > 0.5 ? 0 : 255;
	const mixChannel = (channel: number): number =>
		Math.round(channel + (pole - channel) * GRID_LINE_MIX);
	return toHex(mixChannel(rgb.r), mixChannel(rgb.g), mixChannel(rgb.b));
};

const toHex = (r: number, g: number, b: number): string => {
	const hex = (channel: number): string =>
		channel.toString(16).padStart(2, "0");
	return `#${hex(r)}${hex(g)}${hex(b)}`;
};
