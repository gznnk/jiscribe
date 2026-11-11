import type { Dimensions, Rect } from "@jiscribe/geometry";
import {
	convertBoundingBoxToRect,
	convertRectToBoundingBox,
	unionBoundingBoxes,
} from "@jiscribe/geometry";

import { calcLabelTextBoxSize } from "./calcLabelTextBoxSize";
import { richTextToPlain } from "../../model/objects/types/text/RichText";
import type {
	TextSlot,
	TextSlotStyle,
} from "../../model/objects/types/text/TextSlot";
import { readTextSlotContent } from "../../model/objects/types/text/TextSlot";

/** Empty band between the bottom edge of the box and the top of a caption. */
export const LABEL_TEXT_GAP = 4;

/**
 * Where a `features.text: "label"` type hangs its caption: a box sized from the
 * caption's own text (calcLabelTextBoxSize), centred under the shape's box with
 * {@link LABEL_TEXT_GAP} between them. Sizing it from the text instead of from
 * the box is what keeps it legible when the drawing is scaled down. It has no
 * maximum width: it runs sideways past the shape until the author breaks it.
 *
 * The placement of every such type whose UI definition does not place the
 * caption itself (a `"textSlot"` part kind declared with `visualBounds`): the
 * canvas registers it as the type's text slot region.
 *
 * @param box - The shape's untransformed box; only its height is read, the caption being centred on the origin whatever the width. A zero height puts the caption {@link LABEL_TEXT_GAP} below the centre
 * @param body - The caption's content and styling (see calcLabelTextBoxSize); undefined sizes an empty caption, which still has the minimum box
 * @param typeDefaults - The type's defaults for its body slot (see calcLabelTextBoxSize)
 * @returns The caption rectangle in local coordinates (shape centre as origin), always below the box
 */
export const calcLabelTextRegion = (
	box: Dimensions,
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
): Rect => {
	const { width, height } = calcLabelTextBoxSize(body, typeDefaults);
	return {
		x: -width / 2,
		y: box.height / 2 + LABEL_TEXT_GAP,
		width,
		height,
	};
};

/**
 * Whether a `features.text: "label"` type's caption draws anything: a body whose text
 * has characters. An empty caption still has a box (calcLabelTextRegion) but draws
 * nothing in it.
 *
 * @param body - The caption's content (see calcLabelTextBoxSize); undefined and one with no `text` draw nothing
 */
export const isLabelTextDrawn = (
	body: Partial<TextSlot> | undefined,
): boolean =>
	body?.text !== undefined &&
	richTextToPlain(readTextSlotContent(body.text)) !== "";

/**
 * The drawn extent of a `features.text: "label"` type: its box, widened by the
 * caption (calcLabelTextRegion). An empty caption draws nothing and so adds no
 * extent, or every such shape would reserve a band of empty space below itself.
 *
 * @param box - The shape's untransformed box; the result covers all of it
 * @param body - The caption's content and styling (see calcLabelTextBoxSize); undefined, one with no `text`, and one whose text has no characters all leave the box alone
 * @param typeDefaults - The type's defaults for its body slot (see calcLabelTextBoxSize)
 * @returns The union of the box and the caption in local coordinates (shape centre as origin)
 */
export const calcLabelTextVisualBounds = (
	box: Dimensions,
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
): Rect => {
	const figure: Rect = {
		x: -box.width / 2,
		y: -box.height / 2,
		width: box.width,
		height: box.height,
	};
	if (!isLabelTextDrawn(body)) {
		return figure;
	}
	const extent = unionBoundingBoxes([
		convertRectToBoundingBox(figure),
		convertRectToBoundingBox(calcLabelTextRegion(box, body, typeDefaults)),
	]);
	return extent === null ? figure : convertBoundingBoxToRect(extent);
};
