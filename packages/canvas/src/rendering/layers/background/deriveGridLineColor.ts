/**
 * Fraction the surface color is nudged toward the contrasting luminance pole to
 * make the grid line. A small step keeps the grid subtle and in the surface's
 * hue family (a slight tonal step from the background). Tune here once a settings
 * UI exists.
 */
const GRID_LINE_MIX = 0.14;

type Rgb = { r: number; g: number; b: number };

/**
 * Derives a grid line color from the canvas surface color, so the grid stays a
 * subtle, readable step against any background (light or dark). The line is the
 * background moved toward the contrasting luminance pole by {@link GRID_LINE_MIX},
 * which keeps it tonal instead of a foreign gray. This is the single source of
 * the grid color — there is no separate theme token for it.
 *
 * @param background effective surface color as a color string. Hex
 *   (`#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`) and `rgb()` / `rgba()` are read
 *   (callers pass the DOM-resolved `getComputedStyle(...).backgroundColor`, which
 *   is always one of these); any other form (named colors, `hsl()`, `var(...)`,
 *   the `"auto"` sentinel) is not parseable
 * @returns a `#rrggbb` line color, or `null` when `background` cannot be parsed
 *   or is fully transparent (no surface to derive from) — the caller then leaves
 *   the grid line unset
 */
export const deriveGridLineColor = (background: string): string | null => {
	const rgb = parseRgb(background);
	if (rgb === null) {
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

const parseRgb = (color: string): Rgb | null =>
	parseHex(color.trim()) ?? parseFunctionalRgb(color.trim());

const parseHex = (value: string): Rgb | null => {
	const match = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(
		value,
	);
	if (match === null) {
		return null;
	}
	const hex = match[1];
	// #rgb / #rgba: each digit is doubled (f → ff).
	if (hex.length <= 4) {
		if (hex.length === 4 && parseInt(hex[3] + hex[3], 16) === 0) {
			return null;
		}
		return {
			r: parseInt(hex[0] + hex[0], 16),
			g: parseInt(hex[1] + hex[1], 16),
			b: parseInt(hex[2] + hex[2], 16),
		};
	}
	if (hex.length === 8 && parseInt(hex.slice(6, 8), 16) === 0) {
		return null;
	}
	return {
		r: parseInt(hex.slice(0, 2), 16),
		g: parseInt(hex.slice(2, 4), 16),
		b: parseInt(hex.slice(4, 6), 16),
	};
};

const parseFunctionalRgb = (value: string): Rgb | null => {
	const match = /^rgba?\(([^)]+)\)$/i.exec(value);
	if (match === null) {
		return null;
	}
	// Accept both comma and modern space/slash separators.
	const parts = match[1].split(/[,\s/]+/).filter((part) => part.length > 0);
	if (parts.length < 3) {
		return null;
	}
	// A fully transparent surface has no color to derive from.
	if (parts.length >= 4) {
		const alpha = parts[3].endsWith("%")
			? parseFloat(parts[3]) / 100
			: parseFloat(parts[3]);
		if (Number.isFinite(alpha) && alpha === 0) {
			return null;
		}
	}
	const channel = (raw: string): number | null => {
		const parsed = raw.endsWith("%") ? parseFloat(raw) * 2.55 : parseFloat(raw);
		return Number.isFinite(parsed)
			? Math.max(0, Math.min(255, Math.round(parsed)))
			: null;
	};
	const r = channel(parts[0]);
	const g = channel(parts[1]);
	const b = channel(parts[2]);
	if (r === null || g === null || b === null) {
		return null;
	}
	return { r, g, b };
};

const toHex = (r: number, g: number, b: number): string => {
	const hex = (channel: number): string =>
		channel.toString(16).padStart(2, "0");
	return `#${hex(r)}${hex(g)}${hex(b)}`;
};
