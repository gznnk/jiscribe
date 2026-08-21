import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/textLineHeight";

/**
 * Height a text editor's textarea needs for its content, in local px.
 *
 * `scrollHeight` is a whole number, while the box it has to match on the display
 * side is a sum of line boxes of `fontSize × TEXT_LINE_HEIGHT` — a fraction
 * whenever that product is one (an odd `fontSize`, say). Taking the measurement
 * as the height therefore makes the editor up to 0.5px taller than the text it
 * replaces, which under `align-items: center` moves the text a quarter pixel the
 * moment editing starts (and more once the canvas is zoomed in). Rounding the
 * measurement back to a line count and rebuilding the height from it restores
 * the exact value the display side has.
 *
 * That rebuilt height is only right while every line box really is
 * `fontSize × TEXT_LINE_HEIGHT` tall. A line drawn in more than one font family
 * is taller — the line box is the baseline-aligned union of inline boxes, and
 * how far one reaches past the baseline follows its own font's metrics — and
 * rebuilding from the line count rounds that extra height away, leaving the
 * editor scrolling inside content it has no room for. `scrollHeight` being the
 * whole-pixel rounding of the true height, it can stand at most half a pixel
 * above the rebuilt value for that reason alone; a wider gap is content, and
 * then the measurement itself is the height to take.
 *
 * @param scrollHeight - The textarea's `scrollHeight` measured with its height
 *   collapsed to 0, i.e. content plus vertical padding, rounded to whole pixels
 * @param fontSize - Type size the content is drawn at, in local px; 0 or less
 *   leaves only the padding, since no line box has a height to contribute
 * @param verticalPadding - `padding-top` plus `padding-bottom` of the textarea,
 *   in local px; part of `scrollHeight`, so it is taken off before the division
 * @returns Whole line boxes plus the padding, never fewer than one line while
 *   `fontSize` is positive, and never short of the content it has to hold
 */
export const calcTextAreaHeight = (
	scrollHeight: number,
	fontSize: number,
	verticalPadding: number,
): number => {
	const lineHeight = fontSize * TEXT_LINE_HEIGHT;
	if (lineHeight <= 0) {
		return verticalPadding;
	}
	const lineCount = Math.max(
		1,
		Math.round((scrollHeight - verticalPadding) / lineHeight),
	);
	const fitted = lineCount * lineHeight + verticalPadding;
	return scrollHeight - fitted > 0.5 ? scrollHeight : fitted;
};

/**
 * Sizes a text editor's textarea to its content, so the wrapper's vertical
 * alignment places it exactly where the display overlay had it.
 *
 * The height is collapsed first so the measurement reports the content rather
 * than the height already set; the padding is read back off the element so the
 * styled component stays the single place it is declared.
 *
 * @param textArea - The textarea being edited; its inline `height` is written
 * @param fontSize - Type size the content is drawn at, in local px (the same
 *   value the caller sets on the element, not a value read back from it)
 */
export const fitTextAreaHeight = (
	textArea: HTMLTextAreaElement,
	fontSize: number,
): void => {
	textArea.style.height = "0px";
	const { paddingTop, paddingBottom } = getComputedStyle(textArea);
	const verticalPadding = parseFloat(paddingTop) + parseFloat(paddingBottom);
	textArea.style.height = `${calcTextAreaHeight(
		textArea.scrollHeight,
		fontSize,
		verticalPadding,
	)}px`;
};
