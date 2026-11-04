/**
 * Keywords that read as a bare identifier but paint no color of their own, or
 * one this check cannot know: they are kept out of the named colors below.
 */
const NON_COLOR_KEYWORDS: ReadonlySet<string> = new Set([
	"transparent",
	"currentcolor",
	"inherit",
	"initial",
	"unset",
	"revert",
	"none",
]);

/** `#rgb` / `#rrggbb`, or the same with an alpha digit pair that is all `f`. */
const OPAQUE_HEX_PATTERN = /^#(?:[0-9a-f]{3}f?|[0-9a-f]{6}(?:ff)?)$/i;

/** `rgb()` / `rgba()` / `hsl()` / `hsla()` and what is inside the parentheses. */
const COLOR_FUNCTION_PATTERN = /^(?:rgba?|hsla?)\(([^()]*)\)$/i;

/** One channel of a color function: a number, a percentage, or a hue angle. */
const COLOR_CHANNEL_PATTERN =
	/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:%|deg|rad|grad|turn)?$/i;

/** A bare CSS identifier made of letters alone, which is how every named color is spelled. */
const NAMED_COLOR_PATTERN = /^[a-z]+$/i;

/** Whether the alpha channel of a color function is exactly 1 (or 100%). */
const isOpaqueAlpha = (alpha: string): boolean =>
	alpha.endsWith("%")
		? Number.parseFloat(alpha) === 100
		: Number.parseFloat(alpha) === 1;

/** Whether the inside of a color function reads as three channels and no alpha below 1. */
const isOpaqueColorFunction = (channels: string): boolean => {
	const parts = channels.split(/[\s,/]+/).filter((part) => part.length > 0);
	if (parts.length !== 3 && parts.length !== 4) {
		return false;
	}
	if (!parts.every((part) => COLOR_CHANNEL_PATTERN.test(part))) {
		return false;
	}
	return parts.length === 3 || isOpaqueAlpha(parts[3]);
};

/**
 * Whether a color as a document stores it paints over everything behind it,
 * answered without a browser to resolve it. Only what can be told from the
 * spelling counts: `"auto"` (the theme's shape surface), a hex color with no
 * alpha or an alpha of `f` / `ff`, an `rgb()` / `rgba()` / `hsl()` / `hsla()`
 * whose alpha is absent or 1 / 100%, and a named color. Package-internal.
 *
 * @param color - The value of a `fill` or similar field; surrounding whitespace is ignored, case is not looked at
 * @returns False for anything else, including what may well be opaque but cannot be told from the string: `var(...)`, `color-mix()`, `oklch()`, an unreadable channel, and the keywords `transparent`, `currentColor`, `inherit`, `initial`, `unset`, `revert` and `none`
 */
export const isOpaqueDocColor = (color: string): boolean => {
	const trimmed = color.trim();
	if (trimmed.toLowerCase() === "auto") {
		return true;
	}
	if (OPAQUE_HEX_PATTERN.test(trimmed)) {
		return true;
	}
	const functionMatch = COLOR_FUNCTION_PATTERN.exec(trimmed);
	if (functionMatch !== null) {
		return isOpaqueColorFunction(functionMatch[1]);
	}
	return (
		NAMED_COLOR_PATTERN.test(trimmed) &&
		!NON_COLOR_KEYWORDS.has(trimmed.toLowerCase())
	);
};
