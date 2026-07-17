import type { Dimensions } from "@workspace/geometry";

import { calcCalloutPolygon, resolveCalloutTail } from "./calloutTailGeometry";
import type { CalloutState } from "../../../../states/objects/annotations/callout/CalloutState";
import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";

/**
 * Callout outline (centered): rectangular bubble body + tail per `state.tail`.
 * All straight edges. Renderer draws the equivalent path (buildCalloutPath).
 */
export const calloutOutline: ShapeOutlineProvider<
	Dimensions & Pick<CalloutState, "tail">
> = (state) => {
	const { width, height } = state;
	return calcCalloutPolygon(
		-width / 2,
		-height / 2,
		width,
		height,
		resolveCalloutTail(state),
	);
};
