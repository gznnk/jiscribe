import type { Dimensions } from "@jiscribe/geometry";

import { TEXT_BLOCK_WIDTH_SLACK } from "./textBlockWidthSlack";
import { TEXT_BOX_PADDING_X, TEXT_BOX_PADDING_Y } from "./textBoxPadding";
import type { RichText } from "../../model/objects/types/RichText";
import { layoutVisualLines } from "../layout/layoutVisualLines";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/** Width of a box holding no text, so an empty one still has something to hit. */
export const TEXT_BLOCK_MIN_WIDTH = 16;

/**
 * Size of the box a text of its own — one with no frame to wrap inside — takes.
 * The text is laid out as authored: lines break at `\n` and nowhere else, so
 * width grows with the longest line and there is deliberately no maximum. A part
 * of the text drawn larger widens its line and heightens its line box, as does a
 * part drawn in another font family, so the box grows around it. The caller keeps
 * the box's top-left fixed when this grows.
 *
 * Shared by the `text` object and by every label sized from its own content (the
 * connector's, and the ones canvas-sdk hangs off a shape): sizing them all from
 * here is what keeps a box from having to reproduce the display-side wrapping to
 * learn its own height, which is only ever needed where a maximum width forces a
 * break.
 *
 * @param text - The whole text, authored newlines included; an empty string sizes one empty line, as does each empty line
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family other than the drawn one skews the width
 * @returns The box size including padding. Under an estimating measurement only the height is faithful, the width being proportional
 */
export const calcTextBlockSize = (
	text: RichText,
	font: TextMeasureFont,
): Dimensions => {
	const lines = layoutVisualLines(text, font);

	return {
		width: Math.max(
			TEXT_BLOCK_MIN_WIDTH,
			lines.reduce((widest, line) => Math.max(widest, line.width), 0) +
				TEXT_BOX_PADDING_X * 2 +
				TEXT_BLOCK_WIDTH_SLACK,
		),
		height:
			lines.reduce((total, line) => total + line.height, 0) +
			TEXT_BOX_PADDING_Y * 2,
	};
};
