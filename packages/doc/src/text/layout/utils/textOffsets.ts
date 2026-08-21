import type { RichText, TextRun } from "../../../model/objects/types/RichText";
import { richTextToPlain } from "../../../model/objects/types/RichText";
import type { TextMeasureFont } from "../../measure/TextMeasureFont";
import type { TextWidthMeasurer } from "../../measure/textWidthMeasurer";
import { createTextWidthMeasurer } from "../../measure/textWidthMeasurer";
import { calcMixedFamilyLineSlack } from "../mixedFamilyLineSlack";
import { TEXT_LINE_HEIGHT } from "../textLineHeight";

// The flattened text addressed by offset: the stretches its authored lines
// occupy, and measuring an arbitrary stretch under the runs it falls in. Internal
// to text/layout — no entry re-exports any of it — and shared by the three
// measurements built on it (layoutVisualLines, measureTextWidth,
// calcVisualTextHeight), which is the only reason it is a module of its own.

/** The font a run is drawn with: the slot's, with the run's own overrides on top. */
const resolveRunFont = (
	run: TextRun,
	base: TextMeasureFont,
): TextMeasureFont => ({
	fontSize: run.fontSize ?? base.fontSize,
	fontFamily: run.fontFamily ?? base.fontFamily,
	fontWeight: run.fontWeight ?? base.fontWeight,
	fontStyle: run.fontStyle ?? base.fontStyle,
});

/** A stretch of the flattened text and the font it is drawn with, in the text's own offsets. */
type StyledRange = {
	start: number;
	end: number;
	font: TextMeasureFont;
};

const toStyledRanges = (
	text: RichText,
	base: TextMeasureFont,
): StyledRange[] => {
	if (typeof text === "string") {
		return [{ start: 0, end: text.length, font: base }];
	}
	const ranges: StyledRange[] = [];
	let start = 0;
	for (const run of text) {
		ranges.push({
			start,
			end: start + run.text.length,
			font: resolveRunFont(run, base),
		});
		start += run.text.length;
	}
	return ranges;
};

/**
 * The offset a line's layout reaches, which is one past its last visible
 * character when a newline ends it.
 *
 * A run whose first character is that newline is opened on this line: the break
 * is laid out here, so the browser puts an inline box of the run's own size on
 * this line even though the run draws nothing visible until the next one. A line
 * ended by a soft wrap has no such character, and the offset the next line starts
 * at belongs to that line alone.
 *
 * @param plain - The flattened text the line indexes into
 * @param lineEnd - The line's end offset, exclusive of the newline that ends it
 * @returns `lineEnd + 1` when a newline ends the line, `lineEnd` for a soft wrap or the last line
 */
const calcLineLayoutEnd = (plain: string, lineEnd: number): number =>
	plain[lineEnd] === "\n" ? lineEnd + 1 : lineEnd;

/**
 * Whether `range` is drawn on the offsets `[start, end)` a line is laid out from
 * — which {@link calcLineLayoutEnd} extends past the visible characters, so a run
 * opening at the newline that ends the line counts as being on it.
 *
 * The second clause is for an empty line, a zero-length range that overlaps
 * nothing: it is drawn in the typography of the run it sits in rather than the
 * block's, because the browser keeps the caret's style on the line a break opens.
 * Pressing Enter at the end of a run drawn at 40px gives an empty line with a
 * 40px line box; taking it as the base size measures that line more than a whole
 * line short. A zero-length range therefore also matches the run reaching the
 * offset, leaving only a break at the very start of a text with nothing to
 * inherit.
 */
const isDrawnOn = (range: StyledRange, start: number, end: number): boolean =>
	Math.max(start, range.start) < Math.min(end, range.end) ||
	(start === end && range.start < start && start <= range.end);

/**
 * What decides a line box's height on the offsets `[start, end)` it is laid out
 * from: the tallest type size on it, and whether more than one font family is.
 *
 * The tallest size is never below the base font's own — the block's font sets the
 * line box's floor (the CSS strut), so a line holding only smaller runs is still
 * as tall as an unstyled one, and a range no run is drawn on measures as the base
 * size for the same reason. The base font also counts as one of the families
 * whether or not a run covers the range, so a single run in another family
 * already makes the line mixed.
 *
 * Both come off one pass: every line of every layout asks for them together.
 */
const readLineTypography = (
	ranges: StyledRange[],
	base: TextMeasureFont,
	start: number,
	end: number,
): { maxFontSize: number; isMixedFamily: boolean } => {
	let maxFontSize = base.fontSize;
	let isMixedFamily = false;
	for (const range of ranges) {
		if (!isDrawnOn(range, start, end)) {
			continue;
		}
		if (range.font.fontSize > maxFontSize) {
			maxFontSize = range.font.fontSize;
		}
		if (range.font.fontFamily !== base.fontFamily) {
			isMixedFamily = true;
		}
	}
	return { maxFontSize, isMixedFamily };
};

/**
 * Height of the line box the offsets `[start, end)` are laid out into: the
 * tallest type size on it times the line height, plus what a line in more than
 * one family needs on top ({@link calcMixedFamilyLineSlack}).
 */
const calcLineHeight = (
	ranges: StyledRange[],
	base: TextMeasureFont,
	start: number,
	end: number,
): number => {
	const { maxFontSize, isMixedFamily } = readLineTypography(
		ranges,
		base,
		start,
		end,
	);
	return (
		maxFontSize * TEXT_LINE_HEIGHT +
		(isMixedFamily ? calcMixedFamilyLineSlack(maxFontSize) : 0)
	);
};

/** A styled range with the measurer for its font, built once per layout pass. */
type StyledSegment = StyledRange & { measureWidth: TextWidthMeasurer };

const toStyledSegments = (
	text: RichText,
	base: TextMeasureFont,
): StyledSegment[] =>
	toStyledRanges(text, base).map((range) => ({
		...range,
		measureWidth: createTextWidthMeasurer(range.font),
	}));

/**
 * Measures pieces of one text by offset, each piece under the font of the run it
 * falls in. Built once per layout pass, and the shared context remembers the font
 * it was given, so a piece re-parses the shorthand only where it crosses into a
 * run drawn with another font — an unstyled text parses it once however many
 * pieces are measured.
 */
export type OffsetMeasurer = {
	/** Rendered width of `[start, end)`, summed over the runs it spans. */
	width: (start: number, end: number) => number;
	/** Height of the line box `[start, end)` occupies, the mixed-family allowance included. */
	lineHeight: (start: number, end: number) => number;
};

/**
 * Builds the measurer for one text, together with the flattened string its
 * offsets index into. Only `lineHeight` consults the type sizes, so a caller
 * after heights alone never reaches a width backend.
 *
 * @param text - The whole text, a plain string or the runs it is styled in
 * @param base - Font the slot is drawn with, which each run overrides only where it sets a field
 * @returns `plain`, the runs joined, and `measurer`, which reads offsets into it
 */
export const createOffsetMeasurer = (
	text: RichText,
	base: TextMeasureFont,
): { plain: string; measurer: OffsetMeasurer } => {
	const plain = richTextToPlain(text);
	const segments = toStyledSegments(text, base);
	return {
		plain,
		measurer: {
			width: (start, end) => {
				let total = 0;
				for (const segment of segments) {
					const from = Math.max(start, segment.start);
					const to = Math.min(end, segment.end);
					if (from < to) {
						total += segment.measureWidth(plain.slice(from, to));
					}
				}
				return total;
			},
			lineHeight: (start, end) =>
				calcLineHeight(segments, base, start, calcLineLayoutEnd(plain, end)),
		},
	};
};

/** A stretch of the text, in its own offsets. */
export type TextRange = { start: number; end: number };

/**
 * The lines the text was authored as, split on newlines. The newline itself
 * belongs to neither side — measuring a line's height reattaches it
 * (calcLineLayoutEnd), since it is laid out on the line it ends — so an empty
 * line is an empty range; an empty text is one such line, as is the line a
 * trailing newline opens.
 *
 * @param plain - The flattened text, as `createOffsetMeasurer` returns it
 * @returns One range per authored line, in order, never empty
 */
export const splitAuthoredLines = (plain: string): TextRange[] => {
	const lines: TextRange[] = [];
	let lineStart = 0;
	for (let offset = 0; offset <= plain.length; offset += 1) {
		if (offset === plain.length || plain[offset] === "\n") {
			lines.push({ start: lineStart, end: offset });
			lineStart = offset + 1;
		}
	}
	return lines;
};
