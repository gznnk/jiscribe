import type { ObjectDoc, ObjectDocConnectPointEdgeAnchor } from "@jiscribe/doc";

import { GROUP_MARKER_TIP_CONNECT_POINT_ID } from "./groupMarkerConnectPointIds";
import type {
	GroupMarkerDirection,
	GroupMarkerTipFields,
} from "./GroupMarkerFields";
import {
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";

/** The side of its box each marker's tip lies on: the one it faces. */
const TIP_SIDES: Record<
	GroupMarkerDirection,
	ObjectDocConnectPointEdgeAnchor["side"]
> = {
	left: "left",
	right: "right",
	up: "top",
	down: "bottom",
};

/**
 * Where a group marker document's tip connect point sits on its box — the type's
 * `ObjectDocDefinition.extraConnectPointEdgeAnchors`: on the side the marker faces,
 * `tipPosition` along it, as calcGroupMarkerTip places it on the canvas. It belongs to
 * no `alternateGroup`: a line to the tip stays on the tip.
 *
 * @param doc - Any group marker doc; an absent `direction` / `tipPosition` reads as the field's default
 * @returns The tip alone
 */
export const calcGroupMarkerConnectPointEdgeAnchors = (
	doc: ObjectDoc,
): ObjectDocConnectPointEdgeAnchor[] => {
	const fields = doc as ObjectDoc & GroupMarkerTipFields;
	return [
		{
			id: GROUP_MARKER_TIP_CONNECT_POINT_ID,
			side: TIP_SIDES[resolveGroupMarkerDirection(fields)],
			t: resolveGroupMarkerTipPosition(fields),
		},
	];
};
