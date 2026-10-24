/** A color read from a CSS color string: channels 0–255, alpha 0–1. */
export type RgbaColor = {
	/** Red channel, an integer from 0 to 255. */
	r: number;
	/** Green channel, an integer from 0 to 255. */
	g: number;
	/** Blue channel, an integer from 0 to 255. */
	b: number;
	/** Opacity from 0 (paints nothing) to 1; 1 when the string gives none. */
	alpha: number;
};

/**
 * Reads the hex and `rgb()` / `rgba()` spellings of a color. `getComputedStyle`
 * resolves colors to `rgb()` / `rgba()`, never to hex.
 *
 * @param color hex (`#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`) or
 *   `rgb()` / `rgba()` with comma, space or slash separators and `%` channels or
 *   alpha; surrounding whitespace is ignored
 * @returns `null` for any other form (named colors, `transparent`, `hsl()`,
 *   `var(...)`) and for an unreadable channel or alpha. Alpha is clamped to
 *   0–1, as CSS does.
 */
export const parseRgbaColor = (color: string): RgbaColor | null => {
	const trimmed = color.trim();
	return parseHex(trimmed) ?? parseFunctionalRgb(trimmed);
};

const parseHex = (value: string): RgbaColor | null => {
	const match = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(
		value,
	);
	if (match === null) {
		return null;
	}
	const hex = match[1];
	// #rgb / #rgba: each digit is doubled (f → ff).
	const digits =
		hex.length <= 4
			? Array.from(hex, (digit) => digit + digit)
			: (hex.match(/../g) ?? []);
	const [r, g, b, a] = digits.map((pair) => parseInt(pair, 16));
	return { r, g, b, alpha: a === undefined ? 1 : a / 255 };
};

const parseFunctionalRgb = (value: string): RgbaColor | null => {
	const match = /^rgba?\(([^)]+)\)$/i.exec(value);
	if (match === null) {
		return null;
	}
	// Accept both comma and modern space/slash separators.
	const parts = match[1].split(/[,\s/]+/).filter((part) => part.length > 0);
	if (parts.length < 3) {
		return null;
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
	const alpha = parts.length >= 4 ? readAlpha(parts[3]) : 1;
	if (alpha === null) {
		return null;
	}
	return { r, g, b, alpha };
};

const readAlpha = (raw: string): number | null => {
	const alpha = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
	return Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : null;
};
