import type { ObjectVisualBoundsCalculator } from "@jiscribe/canvas";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type { TextSlot } from "@jiscribe/canvas/doc";
import { readTextSlot } from "@jiscribe/canvas-sdk";
import { CROP_MEASURE_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { calcGroupMarkerTextRegion } from "./calcGroupMarkerTextRegion";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";

/** The box the marker fills, plus what the label is derived from. */
type GroupMarkerVisualBoundsState = Dimensions & {
	/** Which way the marker faces; the label hangs off that side. */
	direction?: GroupMarkerDirection;
	/** Where the tip sits along the span, 0..1; absent on a marker with no movable tip. */
	tipPosition?: number;
	/** The shape's text slots, keyed by slot id; an absent body slot means no label. */
	text?: Record<string, TextSlot>;
};

/**
 * The drawn extent of a group marker: the box it fills, widened towards the tip
 * by the label (calcGroupMarkerTextRegion). An empty label draws nothing, so it
 * contributes no extent — otherwise every marker would reserve a band of empty
 * space beside itself in zoom-to-fit and the export viewBox.
 *
 * @param state The shape's box, tip placement, and text slots.
 * @returns The union of box and label in local coordinates (shape center as origin).
 */
export const calcGroupMarkerVisualBounds: ObjectVisualBoundsCalculator<
	GroupMarkerVisualBoundsState
> = (state) => {
	const marker = {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};

	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return marker;
	}

	// These bounds decide a crop, not the box the text is drawn in, so they measure
	// without the host's family (see CROP_MEASURE_FONT_FAMILY).
	const label = calcGroupMarkerTextRegion(state, BODY_TEXT_SLOT_ID, {
		fontFamily: CROP_MEASURE_FONT_FAMILY,
	});
	const left = Math.min(marker.x, label.x);
	const top = Math.min(marker.y, label.y);
	const right = Math.max(marker.x + marker.width, label.x + label.width);
	const bottom = Math.max(marker.y + marker.height, label.y + label.height);
	return { x: left, y: top, width: right - left, height: bottom - top };
};
