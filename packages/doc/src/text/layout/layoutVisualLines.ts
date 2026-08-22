import type { OffsetMeasurer, TextRange } from "./textOffsets";
import { createOffsetMeasurer, splitAuthoredLines } from "./textOffsets";
import type { VisualLine } from "./VisualLine";
import type { RichText } from "../../model/objects/types/RichText";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

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
 *
 * Every fit test measures the whole stretch from the line's start in one call
 * rather than adding up the pieces placed so far. What a piece takes depends on
 * its neighbours — the browser trims the space between two adjacent CJK
 * punctuation marks (`text-spacing-trim`) and kerns across a script boundary —
 * and none of that appears in a measurement that stops at the piece's edge, so
 * summed pieces overstate a line by up to half an em per adjacent pair. The box
 * a text of its own gets is measured whole (calcTextBlockSize), so measuring the
 * fit the same way is what keeps a line that sized its own box from wrapping
 * inside it.
 */
const wrapLine = (
	plain: string,
	line: TextRange,
	measurer: OffsetMeasurer,
	availableWidth: number,
): TextRange[] => {
	const wrapped: TextRange[] = [];
	let lineStart = line.start;

	const breakAt = (offset: number): void => {
		wrapped.push({ start: lineStart, end: offset });
		lineStart = offset;
	};

	const placeCharacters = (unit: TextRange): void => {
		let offset = unit.start;
		for (const char of plain.slice(unit.start, unit.end)) {
			const charEnd = offset + char.length;
			if (
				!isSpaceCharacter(char) &&
				offset > lineStart &&
				measurer.width(lineStart, charEnd) > availableWidth
			) {
				breakAt(offset);
			}
			offset = charEnd;
		}
	};

	for (const unit of splitIntoWrapUnits(plain, line)) {
		// Trailing spaces hang past the edge under pre-wrap, so they never decide a break.
		const breakEnd = unitBreakEnd(plain, unit);
		if (measurer.width(lineStart, breakEnd) <= availableWidth) {
			continue;
		}
		if (lineStart < unit.start) {
			breakAt(unit.start);
			if (measurer.width(unit.start, breakEnd) <= availableWidth) {
				continue;
			}
		}
		placeCharacters(unit);
	}
	wrapped.push({ start: lineStart, end: line.end });

	return wrapped;
};

/**
 * The lines a text is drawn as, each with the size it takes. Simulates the
 * `white-space: pre-wrap; word-break: break-word` the text boxes are drawn with
 * (TextOverlayFrameStyled / see ConnectorLabelStyled): lines break at spaces, a
 * word longer than the line breaks between characters, and CJK breaks between
 * characters. A body styled per range is measured run by run, so a part drawn
 * larger both widens its line and makes that line's box taller.
 *
 * In a browser, measurement runs on an offscreen canvas, so this can be called
 * every frame; the result matches the drawing only while the drawn font matches
 * `font`. Elsewhere it goes through whichever backend is registered
 * (createTextWidthMeasurer).
 *
 * @param text - The whole text, authored newlines included; an empty string yields one line, as does each empty line
 * @param font - Font the slot is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where lines break
 * @param availableWidth - Content width the text wraps in (box width minus its horizontal padding and border), in local pixels; anything below 1 is treated as 1, and `undefined` lays the text out as authored, breaking only at newlines
 * @returns One entry per drawn line, top to bottom, never empty. With neither a canvas nor a registered measurer the widths are estimated (see measureTextWidth), so they are proportional rather than faithful
 */
export const layoutVisualLines = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): VisualLine[] => {
	const { plain, measurer } = createOffsetMeasurer(text, font);

	const wrapWidth =
		availableWidth === undefined ? undefined : Math.max(1, availableWidth);
	return splitAuthoredLines(plain)
		.flatMap((line) =>
			wrapWidth === undefined
				? [line]
				: wrapLine(plain, line, measurer, wrapWidth),
		)
		.map((line) => ({
			start: line.start,
			end: line.end,
			width: measurer.width(line.start, line.end),
			height: measurer.lineHeight(line.start, line.end),
		}));
};
