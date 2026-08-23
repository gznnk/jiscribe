import type { RichText } from "@jiscribe/doc";
import { richTextToPlain } from "@jiscribe/doc";
import type { VisualLine } from "@jiscribe/doc/unstable";

/**
 * Characters Japanese typesetting does not leave at the head of a line: the ones
 * that belong to the character before them, so a break in front of them reads as
 * an orphan. Held as a string because membership is the only question asked of it.
 *
 * Small kana, the long vowel mark (ー) and the middle dot are deliberately left
 * out. Their handling is a house style rather than a settled rule — a break
 * before a small kana is normal in some typesetting and forbidden in others — and
 * a warning nobody agrees with is a warning that gets switched off. Line *end*
 * prohibition (an opening bracket stranded at the end of a line) is not covered
 * here either.
 *
 * The line breaking this is checked against is the canvas's own, which has no
 * prohibition of its own to apply: it reproduces what a browser does with the
 * canvas's CSS, and that is where the breaks come out. So this states a matter of
 * appearance for the author to fix in the text, not a fault in the drawing.
 */
export const LINE_START_PROHIBITED_CHARACTERS =
	"、。，．）」』】〉》〕｝！？…‥";

/** One drawn line whose first character is one of the forbidden ones. */
export type LineStartProhibition = {
	/** Position of the line among the drawn lines, counting the first line as 1. */
	line: number;
	/** The character standing at the head of that line. */
	character: string;
};

/**
 * Every line of a laid-out text that opens with a character
 * {@link LINE_START_PROHIBITED_CHARACTERS} keeps off a line head. The first line
 * is never reported: nothing broke before it, so its head is where the text
 * begins rather than where it was cut.
 *
 * @param text - The text the lines were laid out from; the offsets in `lines` index its flattened form, so it must be the very text passed to the layout
 * @param lines - The drawn lines in order, as `layoutVisualLines` returns them; a single-line text yields nothing
 * @returns One entry per offending line in line order, empty when every break falls in a place typesetting allows
 */
export const findLineStartProhibitions = (
	text: RichText,
	lines: readonly VisualLine[],
): LineStartProhibition[] => {
	const plain = richTextToPlain(text);
	const prohibitions: LineStartProhibition[] = [];
	lines.forEach((line, index) => {
		const character = plain[line.start];
		if (
			index > 0 &&
			character !== undefined &&
			LINE_START_PROHIBITED_CHARACTERS.includes(character)
		) {
			prohibitions.push({ line: index + 1, character });
		}
	});
	return prohibitions;
};

/**
 * The findings as one clause of a diagnostic message, e.g.
 * `line 3 starts with "。", line 7 starts with "」"`.
 *
 * @param prohibitions - The findings to name, in the order they should read; an empty list yields an empty string, which no caller should be reporting
 */
export const describeLineStartProhibitions = (
	prohibitions: readonly LineStartProhibition[],
): string =>
	prohibitions
		.map(({ line, character }) => `line ${line} starts with "${character}"`)
		.join(", ");
