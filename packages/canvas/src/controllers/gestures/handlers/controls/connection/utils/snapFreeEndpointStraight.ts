import {
	isTransformedFrame,
	snapToDirection,
	type Point,
} from "@jiscribe/geometry";

import { calcEdgeAnchorDirection } from "../../../../../../domain/state/connector/endpoints/calcConnectPoint";
import { resolveEndpoint } from "../../../../../../domain/state/connector/endpoints/resolveEndpoint";
import type { ExtraConnectPoint } from "../../../../../../domain/state/registry/ObjectExtraConnectPointsRegistry";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";

/**
 * Aligns a dragged **free** endpoint onto the fixed end's exit axis so a nearly-straight
 * connector snaps to a single straight segment (and its arrowhead follows the line instead
 * of a tiny routing jog). Snapping moves the endpoint coordinate itself, so the anchor
 * handle, the line, and the arrow all stay together.
 *
 * Only a connectPoint or an edge anchor on a frame shape defines a straight axis: a
 * horizontal exit (left/right) straightens by aligning Y to the fixed point; a vertical
 * exit aligns X. For a connectPoint the exit direction is taken as center → connectPoint
 * (following the shape's rotation, the same basis the orthogonal router uses); an edge
 * anchor uses its side's normal. Returns the cursor unchanged when there is no such axis
 * (center/free fixed end, straight routing has no jog) or the cursor lies beyond
 * `thresholdSvg` from the axis.
 *
 * @param cursor - The dragged free endpoint, in world coordinates
 * @param fixedEndpoint - The endpoint that is not being dragged; only a connectPoint or
 *   an edge anchor on it defines an axis
 * @param fixedObj - The fixed endpoint's owner shape. null/undefined (free, or dangling)
 *   returns the cursor unchanged
 * @param thresholdSvg - How far off the axis the cursor may sit and still snap, in world
 *   units (the caller divides the px threshold by the zoom)
 * @param fixedExtraConnectPoints - The fixed shape's declared extra anchors, so an endpoint
 *   on one of them resolves where it really is; omitted = such an endpoint has no axis
 * @returns The snapped cursor, or the cursor unchanged
 */
export const snapFreeEndpointStraight = (
	cursor: Point,
	fixedEndpoint: EndpointRef,
	fixedObj: ObjectState | null | undefined,
	thresholdSvg: number,
	fixedExtraConnectPoints?: readonly ExtraConnectPoint[] | null,
): Point => {
	const fixedAnchor = fixedEndpoint.anchor;
	if (
		!fixedObj ||
		!isTransformedFrame(fixedObj) ||
		(fixedAnchor.kind !== "connectPoint" && fixedAnchor.kind !== "edge")
	) {
		return cursor;
	}

	const fixedPoint = resolveEndpoint(
		fixedEndpoint,
		fixedObj,
		null,
		null,
		fixedExtraConnectPoints,
	);
	// An id nothing declares resolves to the shape's center, leaving a zero vector
	// that would snap to an arbitrary axis.
	if (
		!fixedPoint ||
		(fixedPoint.x === fixedObj.cx && fixedPoint.y === fixedObj.cy)
	) {
		return cursor;
	}

	// An edge anchor away from the middle of its side sits diagonally from the
	// center, so its axis has to come from the side's own normal instead.
	const direction =
		fixedAnchor.kind === "edge"
			? calcEdgeAnchorDirection(fixedObj, fixedAnchor.side)
			: snapToDirection(fixedPoint.x - fixedObj.cx, fixedPoint.y - fixedObj.cy);

	if (direction === "left" || direction === "right") {
		return Math.abs(cursor.y - fixedPoint.y) <= thresholdSvg
			? { x: cursor.x, y: fixedPoint.y }
			: cursor;
	}
	return Math.abs(cursor.x - fixedPoint.x) <= thresholdSvg
		? { x: fixedPoint.x, y: cursor.y }
		: cursor;
};
