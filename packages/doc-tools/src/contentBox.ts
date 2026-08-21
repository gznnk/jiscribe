import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/canvas/unstable-doc";
import type { Rect } from "@jiscribe/geometry";

import { calcContentInset } from "./contentInsets";

/**
 * The area a shape's text is actually laid out in: its bounding box, minus what
 * the drawn outline takes off each edge ({@link calcContentInset}), minus the
 * padding every text box has ({@link TEXT_BOX_PADDING_X} /
 * {@link TEXT_BOX_PADDING_Y}). This is the width to wrap at and the height to
 * fit into — the pair {@link import("./diagnoseDoc").diagnoseDoc} compares a
 * measurement against.
 *
 * The rectangle is in the shape's own coordinates, whose origin is the centre of
 * the bounding box (the convention the rendering layer's text regions use), so a
 * shape with no inset at all returns `{ x: -width / 2 + 6, y: -height / 2 + 2, … }`.
 *
 * @param type - Object type name; an unknown one is treated as laying its text over the whole box, like `rect`
 * @param width - Bounding-box width in local pixels
 * @param height - Bounding-box height in local pixels
 * @returns The content rectangle, its width and height clamped at 0 for a box too small to hold any; null for a type whose text the box does not hold — a label drawn outside the outline, bands sized from their own text, or no text at all
 */
export const contentBox = (
	type: string,
	width: number,
	height: number,
): Rect | null => {
	const inset = calcContentInset(type, width, height);
	if (inset === null) {
		return null;
	}
	return {
		x: -width / 2 + inset.left + TEXT_BOX_PADDING_X,
		y: -height / 2 + inset.top + TEXT_BOX_PADDING_Y,
		width: Math.max(
			0,
			width - inset.left - inset.right - TEXT_BOX_PADDING_X * 2,
		),
		height: Math.max(
			0,
			height - inset.top - inset.bottom - TEXT_BOX_PADDING_Y * 2,
		),
	};
};
