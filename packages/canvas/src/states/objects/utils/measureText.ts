import { TEXT_LINE_HEIGHT } from "../../../constants/textLineHeight";
import type {
	RichText,
	TextRun,
} from "../../../schemas/objects/types/RichText";
import { richTextToPlain } from "../../../schemas/objects/types/RichText";

/** The font a measurement is taken with; the values a CSS `font` shorthand needs. */
export type TextMeasureFont = {
	/** Type size in local pixels (the same unit the drawn box is measured in). */
	fontSize: number;
	/** Concrete font string (a theme's resolved family, not `inherit`). */
	fontFamily: string;
	/** CSS font-weight keyword or numeric string ("normal" / "bold" / "600"). */
	fontWeight: string;
	/** CSS font-style ("normal" / "italic"); omitted measures as "normal". */
	fontStyle?: string;
};

/**
 * Width one character is assumed to take, as a fraction of the font size, when
 * no canvas is available (non-browser test environments). Rough on purpose: the
 * wrapping it produces is proportional, not faithful.
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

/**
 * Characters a line may break between without a space, matching the CSS default
 * for CJK. Kinsoku (no break before a closing bracket or a full stop) is not
 * applied, so a line ending in such a character can be counted as breaking one
 * character earlier than a browser lays it out.
 */
const CJK_BREAKABLE_PATTERN = /[⺀-〿ぁ-㏿㐀-䶿一-鿿가-힣豈-﫿︰-﹏＀-｠￠-￦]/;

/** Characters that are horizontal whitespace inside a line (a newline never reaches here). */
const isSpaceCharacter = (char: string): boolean =>
	char === " " || char === "\t";

// Offscreen canvas dedicated to measurement (measures width without triggering DOM layout).
let measureCanvas: HTMLCanvasElement | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
	if (typeof document === "undefined") {
		return null;
	}
	if (!measureCanvas) {
		measureCanvas = document.createElement("canvas");
	}
	return measureCanvas.getContext("2d");
};

/** Measures single strings under one font; created once per font so `ctx.font` is set once. */
type TextWidthMeasurer = (text: string) => number;

const createTextWidthMeasurer = (font: TextMeasureFont): TextWidthMeasurer => {
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
		ctx.font = fontShorthand;
		return ctx.measureText(text).width;
	};
};

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
type StyledSegment = {
	start: number;
	end: number;
	font: TextMeasureFont;
	measureWidth: TextWidthMeasurer;
};

const toStyledSegments = (
	text: RichText,
	base: TextMeasureFont,
): StyledSegment[] => {
	if (typeof text === "string") {
		return [
			{
				start: 0,
				end: text.length,
				font: base,
				measureWidth: createTextWidthMeasurer(base),
			},
		];
	}
	const segments: StyledSegment[] = [];
	let start = 0;
	for (const run of text) {
		const font = resolveRunFont(run, base);
		segments.push({
			start,
			end: start + run.text.length,
			font,
			measureWidth: createTextWidthMeasurer(font),
		});
		start += run.text.length;
	}
	return segments;
};

/**
 * Measures pieces of one text by offset, each piece under the font of the run it
 * falls in. Built once per layout pass, so a text of N runs sets `ctx.font` N
 * times rather than once per measured piece.
 */
type OffsetMeasurer = {
	/** Rendered width of `[start, end)`, summed over the runs it spans. */
	width: (start: number, end: number) => number;
	/** The largest type size on `[start, end)`, never below the slot's own. */
	maxFontSize: (start: number, end: number) => number;
};

const createOffsetMeasurer = (
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
			// The block's own font sets the line box's floor (the CSS strut), so a
			// line holding only smaller runs is still as tall as an unstyled one.
			maxFontSize: (start, end) => {
				let largest = base.fontSize;
				for (const segment of segments) {
					if (
						Math.max(start, segment.start) < Math.min(end, segment.end) &&
						segment.font.fontSize > largest
					) {
						largest = segment.font.fontSize;
					}
				}
				return largest;
			},
		},
	};
};

/** A stretch of the text, in its own offsets. */
type TextRange = { start: number; end: number };

/**
 * The smallest pieces a line may not be broken inside: a run of non-space
 * characters with its trailing spaces attached (a break is allowed after them),
 * or a single CJK character. Run boundaries do not split a unit — a word stays
 * one word however much of it is styled.
 */
const splitIntoWrapUnits = (plain: string, line: TextRange): TextRange[] => {
	const units: TextRange[] = [];
	let unitStart = line.start;
	let offset = line.start;
	let previousWasSpace = false;

	const flush = (): void => {
		if (offset > unitStart) {
			units.push({ start: unitStart, end: offset });
		}
		unitStart = offset;
	};

	for (const char of plain.slice(line.start, line.end)) {
		const charEnd = offset + char.length;
		if (isSpaceCharacter(char)) {
			offset = charEnd;
			previousWasSpace = true;
			continue;
		}
		if (CJK_BREAKABLE_PATTERN.test(char)) {
			flush();
			units.push({ start: offset, end: charEnd });
			offset = charEnd;
			unitStart = charEnd;
			previousWasSpace = false;
			continue;
		}
		// The spaces that ended the previous unit are also where it may break.
		if (previousWasSpace) {
			flush();
		}
		offset = charEnd;
		previousWasSpace = false;
	}
	flush();

	return units;
};

/** Offset the trailing spaces of a unit start at: where a break measures the unit up to. */
const unitBreakEnd = (plain: string, unit: TextRange): number => {
	let end = unit.end;
	while (end > unit.start && isSpaceCharacter(plain[end - 1])) {
		end -= 1;
	}
	return end;
};

/**
 * Breaks one authored line into the visual lines it occupies: units are packed
 * greedily, and a unit too long for an empty line is split between characters
 * (break-word).
 */
const wrapLine = (
	plain: string,
	line: TextRange,
	measurer: OffsetMeasurer,
	availableWidth: number,
): TextRange[] => {
	const wrapped: TextRange[] = [];
	let lineStart = line.start;
	let filledWidth = 0;

	const breakAt = (offset: number): void => {
		wrapped.push({ start: lineStart, end: offset });
		lineStart = offset;
		filledWidth = 0;
	};

	const placeCharacters = (unit: TextRange): void => {
		let offset = unit.start;
		for (const char of plain.slice(unit.start, unit.end)) {
			const charEnd = offset + char.length;
			const charWidth = measurer.width(offset, charEnd);
			if (
				!isSpaceCharacter(char) &&
				filledWidth > 0 &&
				filledWidth + charWidth > availableWidth
			) {
				breakAt(offset);
			}
			filledWidth += charWidth;
			offset = charEnd;
		}
	};

	for (const unit of splitIntoWrapUnits(plain, line)) {
		const unitWidth = measurer.width(unit.start, unit.end);
		// Trailing spaces hang past the edge under pre-wrap, so they never decide a break.
		const breakWidth = measurer.width(unit.start, unitBreakEnd(plain, unit));
		if (filledWidth + breakWidth <= availableWidth) {
			filledWidth += unitWidth;
			continue;
		}
		if (filledWidth > 0) {
			breakAt(unit.start);
			if (breakWidth <= availableWidth) {
				filledWidth = unitWidth;
				continue;
			}
		}
		placeCharacters(unit);
	}
	wrapped.push({ start: lineStart, end: line.end });

	return wrapped;
};

/** One drawn line of text: what it takes horizontally, and the line box it sits in. */
export type VisualLine = {
	/** Rendered width in local pixels, trailing spaces included. */
	width: number;
	/** Line box height: the tallest type size on the line × the shared line-height. */
	height: number;
};

/**
 * The lines a text is drawn as, each with the size it takes. Simulates the
 * `white-space: pre-wrap; word-break: break-word` the text boxes are drawn with
 * (TextOverlayFrameStyled / see ConnectorLabelStyled): lines break at spaces, a
 * word longer than the line breaks between characters, and CJK breaks between
 * characters. A body styled per range is measured run by run, so a part drawn
 * larger both widens its line and makes that line's box taller.
 *
 * Measurement runs on an offscreen canvas, so this can be called every frame;
 * the result matches the drawing only while the drawn font matches `font`.
 *
 * @param text - The whole text, authored newlines included; an empty string yields one line, as does each empty line
 * @param font - Font the slot is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where lines break
 * @param availableWidth - Content width the text wraps in (box width minus its horizontal padding and border), in local pixels; anything below 1 is treated as 1, and `undefined` lays the text out as authored, breaking only at newlines
 * @returns One entry per drawn line, top to bottom, never empty. Outside a browser the widths are estimated (see measureTextWidth), so they are proportional rather than faithful
 */
export const layoutVisualLines = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): VisualLine[] => {
	const { plain, measurer } = createOffsetMeasurer(text, font);

	const authoredLines: TextRange[] = [];
	let lineStart = 0;
	for (let offset = 0; offset <= plain.length; offset += 1) {
		if (offset === plain.length || plain[offset] === "\n") {
			authoredLines.push({ start: lineStart, end: offset });
			lineStart = offset + 1;
		}
	}

	const wrapWidth =
		availableWidth === undefined ? undefined : Math.max(1, availableWidth);
	return authoredLines
		.flatMap((line) =>
			wrapWidth === undefined
				? [line]
				: wrapLine(plain, line, measurer, wrapWidth),
		)
		.map((line) => ({
			width: measurer.width(line.start, line.end),
			height: measurer.maxFontSize(line.start, line.end) * TEXT_LINE_HEIGHT,
		}));
};

/**
 * Rendered width of a single line, in the same local pixels as `fontSize`.
 * Measured on an offscreen canvas, so it can run every frame without triggering
 * DOM layout.
 *
 * @param text - One line; an embedded newline is measured as an ordinary character rather than starting a new line
 * @param font - Font the text is drawn with; a family other than the drawn one skews the result
 * @returns The width, or a `characters × fontSize × 0.6` estimate outside a browser
 */
export const measureTextWidth = (
	text: RichText,
	font: TextMeasureFont,
): number => {
	const { plain, measurer } = createOffsetMeasurer(text, font);
	return measurer.width(0, plain.length);
};

/**
 * Number of lines the text occupies once wrapped into a box of the given width,
 * counting authored newlines and automatic wrapping alike (see
 * {@link layoutVisualLines}). Multiply by `fontSize × line-height` for a box
 * height that does not clip the text — or, for a text whose runs are not all one
 * size, take {@link calcVisualTextHeight} instead.
 *
 * @param text - The whole text, authored newlines included; an empty string counts as one line, as does each empty line
 * @param font - Font the text is drawn with; a family other than the drawn one moves where lines break
 * @param availableWidth - Content width the text wraps in, in local pixels; anything below 1 is treated as 1
 * @returns The line count, always at least 1
 */
export const calcVisualLineCount = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth: number,
): number => layoutVisualLines(text, font, availableWidth).length;

/**
 * Height the drawn lines of a text add up to, the line boxes of parts drawn
 * larger included. The height counterpart of {@link calcVisualLineCount}, and
 * equal to `lineCount × fontSize × line-height` whenever nothing overrides the
 * type size.
 *
 * @param text - The whole text, authored newlines included
 * @param font - Font the slot is drawn with
 * @param availableWidth - Content width the text wraps in; `undefined` lays it out as authored, breaking only at newlines
 * @returns The total height in local pixels, never below one line box
 */
export const calcVisualTextHeight = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): number =>
	layoutVisualLines(text, font, availableWidth).reduce(
		(total, line) => total + line.height,
		0,
	);
