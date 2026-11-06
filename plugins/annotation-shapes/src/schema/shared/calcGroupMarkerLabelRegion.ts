import type { ObjectDocLabelRegionCalculator } from "@jiscribe/doc";
import { calcLabelTextBoxSize } from "@jiscribe/doc";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { GroupMarkerTipFields } from "./GroupMarkerFields";
import { GROUP_MARKER_LABEL_GAP } from "./GroupMarkerFields";
import {
	calcGroupMarkerTip,
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";

/**
 * What the label placement reads off a group marker, doc or state alike: the box
 * the marker fills and where its tip is. Both fields are optional, so a plain
 * bracket (no `tipPosition`) is one too.
 */
export type GroupMarkerLabelBox = Dimensions & GroupMarkerTipFields;

/**
 * Places a group marker's label: a box sized from its own text
 * (calcLabelTextBoxSize), set just beyond the tip and centered on it. Sizing the
 * label from the text rather than from the box is what lets the marker stay a
 * thin band — the two never compete for room, and the tip always points at the
 * middle of the name it gives the group.
 *
 * Declared as the doc definition's `labelRegion`, from which the core places the
 * drawn label, the in-place editor and the visual bounds; while editing, the
 * grafted draft text reaches here, so the box follows every keystroke.
 *
 * @param box - The marker's untransformed box with its `direction` and `tipPosition`; absent ones read as their defaults
 * @param body - The label's content and styling (see calcLabelTextBoxSize); undefined lays out an empty label, which still has the minimum box
 * @param typeDefaults - The type's defaults for its body slot, so the label is measured in the font it is drawn in
 * @returns The label rectangle in local coordinates (shape center as origin), always outside the box
 */
export const calcGroupMarkerLabelRegion: ObjectDocLabelRegionCalculator<
	GroupMarkerLabelBox
> = (box, body, typeDefaults): Rect => {
	const direction = resolveGroupMarkerDirection(box);
	const { width, height } = calcLabelTextBoxSize(body, typeDefaults);
	const tip = calcGroupMarkerTip(
		-box.width / 2,
		-box.height / 2,
		box.width,
		box.height,
		direction,
		resolveGroupMarkerTipPosition(box),
	);

	switch (direction) {
		case "left":
			return {
				x: tip.x - GROUP_MARKER_LABEL_GAP - width,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "right":
			return {
				x: tip.x + GROUP_MARKER_LABEL_GAP,
				y: tip.y - height / 2,
				width,
				height,
			};
		case "up":
			return {
				x: tip.x - width / 2,
				y: tip.y - GROUP_MARKER_LABEL_GAP - height,
				width,
				height,
			};
		case "down":
			return {
				x: tip.x - width / 2,
				y: tip.y + GROUP_MARKER_LABEL_GAP,
				width,
				height,
			};
	}
};
