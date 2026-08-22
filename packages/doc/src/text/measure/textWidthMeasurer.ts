import type { TextMeasureFont } from "./TextMeasureFont";

/** Measures single strings under one font, assigning `ctx.font` only when another font was measured since. */
export type TextWidthMeasurer = (text: string) => number;

/**
 * Builds the measurer for one font, or returns null to hand the font to the next
 * stage (see {@link setTextWidthMeasurerFactory}).
 */
export type TextWidthMeasurerFactory = (
	font: TextMeasureFont,
) => TextWidthMeasurer | null;

/**
 * Width one character is assumed to take, as a fraction of the font size, when
 * no canvas is available (non-browser test environments). Rough on purpose: the
 * wrapping it produces is proportional, not faithful.
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

/**
 * The factory a host registered, tried ahead of the canvas. Null in a browser,
 * where nothing registers one.
 */
let registeredMeasurerFactory: TextWidthMeasurerFactory | null = null;

/** Bumped by every {@link setTextWidthMeasurerFactory} call; read by {@link readTextWidthBackendGeneration}. */
let backendGeneration = 0;

/**
 * How many times the measurement backend has been swapped, as a value a cache of
 * measured results can compare against the one it was filled under. Two readings
 * that differ mean the widths behind them came from different backends, so
 * anything measured before the first one has to be measured again.
 *
 * Internal to this package: nothing outside it registers a backend more than
 * once (`installNodeTextMeasurer`), and the tests that swap one are what makes it
 * worth checking at all.
 *
 * @returns A counter starting at 0, meaningful only when compared with another reading
 */
export const readTextWidthBackendGeneration = (): number => backendGeneration;

/**
 * Puts a measurement backend in front of the offscreen canvas, for hosts that
 * have no canvas but do have font metrics — `@jiscribe/doc-tools` reads the
 * bundled font files in Node and registers one here, which is what lets a
 * headless diagnosis reproduce the browser's line breaking instead of the
 * character-count estimate this module falls back to.
 *
 * A browser never calls this, so the drawn canvas keeps measuring exactly as
 * before. Registration is process-wide and takes effect from the next
 * measurement on; measurers already built for a layout pass keep the backend
 * they were built with.
 *
 * @param factory - Builds the measurer for one font, or returns null for a font it cannot measure (an unknown family), which falls through to the canvas and then to the estimate; pass null to unregister
 */
export const setTextWidthMeasurerFactory = (
	factory: TextWidthMeasurerFactory | null,
): void => {
	registeredMeasurerFactory = factory;
	backendGeneration += 1;
};

// Offscreen canvas dedicated to measurement (measures width without triggering DOM layout).
let measureCanvas: HTMLCanvasElement | null = null;

/**
 * Shorthand last assigned to the shared context's `font`, or null when nothing
 * has been assigned yet. Tracked beside the canvas because every measurer draws
 * on that one context, so a measurer can tell whether its font is still the one
 * in effect. Nothing ever resizes the canvas, which would reset the context's
 * state and leave this stale.
 */
let assignedFontShorthand: string | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
	if (typeof document === "undefined") {
		return null;
	}
	if (!measureCanvas) {
		measureCanvas = document.createElement("canvas");
		assignedFontShorthand = null;
	}
	return measureCanvas.getContext("2d");
};

/**
 * The measurer for one font, taken from the first of three backends that can
 * supply it: a registered factory ({@link setTextWidthMeasurerFactory}), the
 * offscreen canvas, then a `characters × fontSize × 0.6` estimate.
 *
 * @param font - The font to measure under; its family decides whether a registered factory takes it
 */
export const createTextWidthMeasurer = (
	font: TextMeasureFont,
): TextWidthMeasurer => {
	const registered = registeredMeasurerFactory?.(font);
	if (registered) {
		return registered;
	}
	const ctx = getMeasureContext();
	if (!ctx) {
		// When measurement is unavailable (non-browser environment), fall back to a rough estimate from character count.
		return (text) => text.length * font.fontSize * FALLBACK_CHAR_WIDTH_RATIO;
	}
	// Size and family are the only required parts of the CSS font shorthand, and
	// they must come last in that order; style and weight may precede them in any
	// order. An assignment that does not parse is dropped and ctx.font silently
	// keeps its previous value, so a missing font.fontFamily would measure with
	// whatever was set last rather than raising.
	const fontShorthand = `${font.fontStyle ?? "normal"} ${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
	return (text) => {
		// Each assignment re-parses the shorthand, which costs more than the
		// measurement itself where a word is measured character by character.
		if (assignedFontShorthand !== fontShorthand) {
			ctx.font = fontShorthand;
			assignedFontShorthand = fontShorthand;
		}
		return ctx.measureText(text).width;
	};
};
