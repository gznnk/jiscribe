/** Colors that resolve against the element using them, so no one value stands for them. */
const CONTEXT_DEPENDENT_COLOR = /var\(|currentcolor/i;

/**
 * The browser's own spelling of a CSS color, as a canvas 2D context serializes it:
 * `#rrggbb` when opaque, `rgba(...)` otherwise, and the color's own function for
 * spaces it does not convert (`oklch()`, `color-mix()` and the like, depending on
 * the browser).
 *
 * Browser-only: it draws on a detached `<canvas>`, which is never attached to the
 * document.
 *
 * @param color any string; surrounding whitespace is ignored
 * @returns `null` for a string the canvas does not take as a color (`"auto"`,
 *   `""`, `inherit`), and for `var(...)` and `currentColor` anywhere in it, which
 *   resolve per element
 */
export const normalizeCssColor = (color: string): string | null => {
	if (CONTEXT_DEPENDENT_COLOR.test(color)) {
		return null;
	}
	const context = document.createElement("canvas").getContext("2d");
	if (context === null) {
		return null;
	}
	// An assignment the canvas rejects leaves the previous value in place, so a
	// color is read only when two different starting values both give way to it.
	context.fillStyle = "#000000";
	context.fillStyle = color;
	const fromBlack = context.fillStyle;
	context.fillStyle = "#ffffff";
	context.fillStyle = color;
	const fromWhite = context.fillStyle;
	return typeof fromBlack === "string" && fromBlack === fromWhite
		? fromBlack
		: null;
};
