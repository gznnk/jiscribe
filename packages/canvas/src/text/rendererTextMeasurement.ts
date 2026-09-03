import type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";
import type { TextMeasurement } from "@jiscribe/doc/text/measure/TextMeasurement";
import type { TextWidthMeasurer } from "@jiscribe/doc/text/measure/textWidthMeasurer";

/**
 * The measurement the canvas offers: the browser measuring the very text it is
 * about to draw, on an offscreen canvas of its own so a width costs no DOM
 * layout. `source: "renderer"` — nothing outranks it, which is the point: in a
 * process that draws, the drawing decides.
 *
 * The canvas and the font last assigned to its context are held here for the
 * life of the process. Every measurer shares that one context, so each records
 * the shorthand it needs and re-assigns only when another font has been measured
 * since — assignment re-parses the shorthand, which costs more than the
 * measurement itself where a word is measured character by character. Nothing
 * resizes the canvas, which would reset the context and leave the record stale.
 *
 * @returns The measurement, or null where the host cannot supply one — no `document` (the package imported for its types alone in Node) or a `document` whose canvas has no 2d context (jsdom). Abstaining leaves the slot to a lesser implementation rather than choosing one
 */
export const createRendererTextMeasurement = (): TextMeasurement | null => {
	if (typeof document === "undefined") {
		return null;
	}
	const ctx = document.createElement("canvas").getContext("2d");
	if (!ctx) {
		return null;
	}
	let assignedFontShorthand: string | null = null;
	return {
		source: "renderer",
		createMeasurer: (font: TextMeasureFont): TextWidthMeasurer => {
			// Size and family are the only required parts of the CSS font shorthand,
			// and they must come last in that order; style and weight may precede them
			// in any order. An assignment that does not parse is dropped and ctx.font
			// silently keeps its previous value, so a missing font.fontFamily would
			// measure with whatever was set last rather than raising.
			const fontShorthand = `${font.fontStyle ?? "normal"} ${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
			return (text) => {
				if (assignedFontShorthand !== fontShorthand) {
					ctx.font = fontShorthand;
					assignedFontShorthand = fontShorthand;
				}
				return ctx.measureText(text).width;
			};
		},
	};
};
