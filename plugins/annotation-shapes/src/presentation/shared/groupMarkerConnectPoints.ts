import type {
	ExtraConnectPoint,
	ObjectExtraConnectPointsCalculator,
} from "@jiscribe/canvas";
import type { Dimensions, Point } from "@jiscribe/geometry";

import {
	calcGroupMarkerTip,
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";
import type {
	GroupMarkerDirection,
	GroupMarkerTipFields,
} from "../../schema/shared/GroupMarkerFields";

/**
 * Id of the connection point on a marker's tip. Stored in a saved doc as
 * `{ "kind": "connectPoint", "id": "tip" }`, so it is part of the file format:
 * point a connector at it to attach to the cusp of a `{` rather than to an edge
 * midpoint of the thin band around it.
 */
export const GROUP_MARKER_TIP_CONNECT_POINT_ID = "tip";

/** The way each marker faces, as a local outward unit vector. */
const TIP_OUTWARD_DIRECTIONS: Record<GroupMarkerDirection, Point> = {
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
};

/** The box the tip sits on, plus what places it along the span. */
type GroupMarkerConnectPointsState = Dimensions & GroupMarkerTipFields;

/**
 * The marker's tip as a connection point. It is the one place on a group marker
 * a connector should attach to — the band's edge midpoints are arbitrary points
 * on a decoration — so it is offered on top of them rather than instead of them.
 * A marker with no movable tip (the plain bracket) resolves to the middle of its
 * spine, which is where its label already points from.
 *
 * @param state The marker's box, facing, and tip placement; an absent
 *   `direction` / `tipPosition` takes the field's default.
 * @returns The single tip point, in local coordinates (shape center as origin).
 */
export const calcGroupMarkerConnectPoints: ObjectExtraConnectPointsCalculator<
	GroupMarkerConnectPointsState
> = (state): readonly ExtraConnectPoint[] => {
	const direction = resolveGroupMarkerDirection(state);
	return [
		{
			id: GROUP_MARKER_TIP_CONNECT_POINT_ID,
			point: calcGroupMarkerTip(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
				direction,
				resolveGroupMarkerTipPosition(state),
			),
			direction: TIP_OUTWARD_DIRECTIONS[direction],
		},
	];
};
