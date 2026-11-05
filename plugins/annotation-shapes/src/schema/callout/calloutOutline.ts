import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";

import type { CalloutDoc } from "./CalloutDoc";
import { resolveCalloutTail } from "./CalloutDoc";
import { calcCalloutPolygon } from "./calloutTailGeometry";

/**
 * Callout outline (centered): rectangular bubble body + tail per `tail`.
 * All straight edges. Renderer draws the equivalent path (buildCalloutPath).
 *
 * Not star-shaped about the center for a tail position of 0.31..0.69, on any
 * side: the base sits in a fixed slot (CALLOUT_TAIL_BASE_SLOTS) while the tip
 * follows `position`, so past that offset one end of the base swings angularly
 * beyond the tip. A ray from the center then crosses the outline three times,
 * over a window of up to 32.6° on the top and bottom edges.
 *
 * The cost is a center-anchored connector whose endpoint stops on the body edge
 * with the line drawn across the tail (up to ~15px), and which moves
 * discontinuously as the far endpoint sweeps that window. Accepted as-is:
 * removing it means moving the base with the tip, which changes the drawn shape
 * for every middling `position`. Same call as the folder's tab in
 * plugins/general-shapes.
 */
export const calloutOutline: ObjectDocOutlineCalculator<
	Pick<CalloutDoc, "width" | "height" | "tail">
> = (shape) => {
	const { width, height } = shape;
	return calcCalloutPolygon(
		-width / 2,
		-height / 2,
		width,
		height,
		resolveCalloutTail(shape),
	);
};
