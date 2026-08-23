import type {
	TextMeasureFont,
	TextMeasurement,
	TextWidthMeasurer,
} from "@jiscribe/doc/unstable";
import { createEstimateTextMeasurement } from "@jiscribe/doc/unstable";
import * as fontkit from "fontkit";

import { getFontFaceIndex } from "./fontFaceIndex";
import { parseFontStack } from "./fontSourcePackages";
import { calcPunctuationTrimEm } from "./punctuationTrim";

/**
 * Width a character no shipped family covers is assumed to take, as a fraction of
 * the type size. The same ratio `createEstimateTextMeasurement` charges, repeated
 * here so a string mixing covered and uncovered characters stays one measurement
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
 * advances, then takes back what the browser trims between adjacent fullwidth
 * punctuation ({@link calcPunctuationTrimEm}). A code point no family covers is
 * charged the estimate, so the result degrades character by character instead of
 * all at once.
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

	// Applied over the whole text rather than per run: the browser trims across the
	// boundary between two faces as readily as inside one (`、` and `「` come from
	// different fontsource subsets), and the runs are split exactly there.
	return total - calcPunctuationTrimEm(text) * font.fontSize;
};

/** What a font stack naming no shipped family falls back to, built once. */
const estimateMeasurement = createEstimateTextMeasurement();

/**
 * The measurement itself, built once: the slot holds an offer by identity, so an
 * entry point offering it on every call must offer the same object every time.
 */
const measurement: TextMeasurement = {
	source: "font-metrics",
	createMeasurer: (font: TextMeasureFont): TextWidthMeasurer => {
		const families = parseFontStack(font.fontFamily);
		if (families.length === 0) {
			// A stack naming nothing the canvas ships is estimated rather than
			// measured against a face it is not drawn in.
			return estimateMeasurement.createMeasurer(font);
		}
		return (text) => measureWithFontStack(text, font, families);
	},
};

/**
 * Text measurement read from the font files this package depends on, for a Node
 * host to offer (`offerTextMeasurement`) so that line breaking and box sizes come
 * out as they do in a browser rather than from a character-count estimate.
 *
 * Every entry point of this package offers it before measuring, so a caller needs
 * it only when driving the document layer's measurement directly — a host that
 * builds its own `createDocOps` and lets it derive heights, say. Offering it in a
 * process where `@jiscribe/canvas` is drawing is harmless: the canvas measures
 * itself, which outranks this, so the offer is declined.
 *
 * @returns The one instance, on every call; re-offering it is a no-op precisely because it is the same object
 */
export const nodeTextMeasurement = (): TextMeasurement => measurement;
