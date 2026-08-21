import type {
	TextMeasureFont,
	TextWidthMeasurer,
	TextWidthMeasurerFactory,
} from "@jiscribe/canvas/unstable-doc";
import { setTextWidthMeasurerFactory } from "@jiscribe/canvas/unstable-doc";
import * as fontkit from "fontkit";

import { getFontFaceIndex } from "./fontFaceIndex";
import { parseFontStack } from "./fontSourcePackages";

/**
 * Width a character of an unmeasurable family is assumed to take, as a fraction
 * of the type size. The same ratio the canvas falls back to, repeated here so a
 * string mixing measurable and unmeasurable characters stays one measurement
 * rather than two.
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

const fontByPath = new Map<string, fontkit.Font | null>();

const openFont = (filePath: string): fontkit.Font | null => {
	const cached = fontByPath.get(filePath);
	if (cached !== undefined) {
		return cached;
	}
	let font: fontkit.Font | null = null;
	try {
		const opened = fontkit.openSync(filePath);
		// A fontsource file holds one face; openSync widens the type to a collection
		// for the .ttc case, which cannot occur here.
		font = "unitsPerEm" in opened ? opened : null;
	} catch {
		font = null;
	}
	fontByPath.set(filePath, font);
	return font;
};

/**
 * The font file a code point is drawn from: the first family of the stack that
 * covers it, exactly as a browser walks a `font-family` list per character.
 */
const findFileForCodePoint = (
	families: readonly string[],
	fontWeight: string,
	italic: boolean,
	codePoint: number,
): string | null => {
	for (const family of families) {
		const filePath = getFontFaceIndex(
			family,
			fontWeight,
			italic,
		)?.findFileForCodePoint(codePoint);
		if (filePath != null) {
			return filePath;
		}
	}
	return null;
};

/**
 * Advance of one run under one face, in ems. Measured through fontkit's layout,
 * so the kerning and the substitutions the browser applies are applied here too
 * — which is why a run is kept whole rather than summed character by character.
 */
const calcRunAdvanceEm = (font: fontkit.Font, run: string): number =>
	font.layout(run).advanceWidth / font.unitsPerEm;

/**
 * Splits the text into maximal stretches drawn from one file and adds up their
 * advances. A code point no family covers is charged the estimate, so the result
 * degrades character by character instead of all at once.
 */
const measureWithFontStack = (
	text: string,
	font: TextMeasureFont,
	families: readonly string[],
): number => {
	const italic = font.fontStyle === "italic";
	let total = 0;
	let runFilePath: string | null = null;
	let run = "";

	const flushRun = (): void => {
		if (run === "") {
			return;
		}
		const runFont = runFilePath === null ? null : openFont(runFilePath);
		total +=
			runFont === null
				? [...run].length * FALLBACK_CHAR_WIDTH_RATIO * font.fontSize
				: calcRunAdvanceEm(runFont, run) * font.fontSize;
		run = "";
	};

	for (const char of text) {
		const filePath = findFileForCodePoint(
			families,
			font.fontWeight,
			italic,
			char.codePointAt(0) ?? 0,
		);
		if (filePath !== runFilePath) {
			flushRun();
			runFilePath = filePath;
		}
		run += char;
	}
	flushRun();

	return total;
};

/**
 * Builds a measurer for one font, or returns null for a font stack naming no
 * family the canvas ships — which leaves that font to the canvas's own estimate
 * rather than measuring it against a face it is not drawn in.
 */
const nodeTextWidthMeasurerFactory: TextWidthMeasurerFactory = (
	font: TextMeasureFont,
): TextWidthMeasurer | null => {
	const families = parseFontStack(font.fontFamily);
	if (families.length === 0) {
		return null;
	}
	return (text) => measureWithFontStack(text, font, families);
};

let installed = false;

/**
 * Points the canvas's text measurement at the font files this package depends on,
 * so line breaking and box sizes come out as they do in a browser rather than
 * from the character-count estimate a host without a canvas falls back to
 * (`setTextWidthMeasurerFactory`).
 *
 * Every entry point of this package calls it before measuring, so a caller only
 * needs it when driving `@jiscribe/canvas` measurement directly. Idempotent, and
 * process-wide: there is one canvas measurement backend, not one per document.
 */
export const installNodeTextMeasurer = (): void => {
	if (installed) {
		return;
	}
	setTextWidthMeasurerFactory(nodeTextWidthMeasurerFactory);
	installed = true;
};
