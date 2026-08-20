import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { TextSlot } from "@jiscribe/canvas/doc";
import { calcLabelBoxSize } from "@jiscribe/canvas-sdk";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import {
	calcGroupMarkerTip,
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import { GROUP_MARKER_LABEL_GAP } from "../../schema/shared/GroupMarkerFields";

/**
 * What the label layout reads off the state: the box the marker fills, where its
 * tip is, and the text slots the label is sized from. Typed as the open slot map
 * every text-bearing state carries rather than one shape's own single slot, so
 * the registry's calculator type still accepts it.
 */
type GroupMarkerLabelState = Dimensions & {
	/** Which way the marker faces; the label hangs off that side. */
	direction?: GroupMarkerDirection;
	/** Where the tip sits along the span, 0..1; absent on a marker with no movable tip. */
	tipPosition?: number;
	/** The shape's text slots, keyed by slot id; an absent slot reads as empty. */
	text?: Record<string, TextSlot>;
};

/**
 * Places a group marker's label: a box sized from its own text
 * (calcLabelBoxSize), set just beyond the tip and centered on it. Sizing the
 * label from the text rather than from the box is what lets the marker stay a
 * thin band — the two never compete for room, and the tip always points at the
 * middle of the name it gives the group.
 *
 * Register as the type's `textRegion`, so the drawn label and the in-place
 * editor resolve the same rectangle; while editing, the grafted draft text
 * reaches here, so the box follows every keystroke. Pair it with
 * `calcGroupMarkerVisualBounds`, or zoom-to-fit and the export viewBox crop the
 * label away.
 *
 * @param state The shape's box, tip placement, and text slots.
 * @param slotId Which slot to place; a shape with no such slot lays out an empty label.
 * @param context The drawing context; its family is what a slot naming none is measured with, matching what the overlay draws.
 * @returns The label rectangle in local coordinates (shape center as origin), always outside the box.
 */
export const calcGroupMarkerTextRegion: ObjectTextRegionCalculator<
	GroupMarkerLabelState
> = (state, slotId, context): Rect => {
	const direction = resolveGroupMarkerDirection(state);
	const { width, height } = calcLabelBoxSize(
		state.text,
		slotId,
		context.fontFamily,
	);
	const tip = calcGroupMarkerTip(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
		direction,
		resolveGroupMarkerTipPosition(state),
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
