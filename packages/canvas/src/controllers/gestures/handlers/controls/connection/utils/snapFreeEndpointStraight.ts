import {
	isTransformedFrame,
	snapToDirection,
	type Point,
} from "@workspace/geometry";

import { resolveEndpoint } from "../../../../../../presentations/layers/content/utils/endpoints/resolveEndpoint";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";

/**
 * Aligns a dragged **free** endpoint onto the fixed end's exit axis so a nearly-straight
 * connector snaps to a single straight segment (and its arrowhead follows the line instead
 * of a tiny routing jog). Snapping moves the endpoint coordinate itself, so the anchor
 * handle, the line, and the arrow all stay together.
 *
 * Only a connectPoint on a frame shape defines a straight axis: a horizontal exit
 * (left/right) straightens by aligning Y to the fixed point; a vertical exit aligns X.
 * The exit direction is taken as center → connectPoint (following the shape's rotation,
 * the same basis the orthogonal router uses). Returns the cursor unchanged when there is
 * no such axis (center/free fixed end, straight routing has no jog) or the cursor lies
 * beyond `thresholdSvg` from the axis.
 */
export const snapFreeEndpointStraight = (
	cursor: Point,
	fixedEndpoint: EndpointRef,
	fixedObj: ObjectState | null | undefined,
	thresholdSvg: number,
): Point => {
	if (
		!fixedObj ||
		!isTransformedFrame(fixedObj) ||
		fixedEndpoint.anchor.kind !== "connectPoint"
	) {
		return cursor;
	}

	const fixedPoint = resolveEndpoint(fixedEndpoint, fixedObj);
	if (!fixedPoint) {
		return cursor;
	}

	const direction = snapToDirection(
		fixedPoint.x - fixedObj.cx,
		fixedPoint.y - fixedObj.cy,
	);

	if (direction === "left" || direction === "right") {
		return Math.abs(cursor.y - fixedPoint.y) <= thresholdSvg
			? { x: cursor.x, y: fixedPoint.y }
			: cursor;
	}
	return Math.abs(cursor.x - fixedPoint.x) <= thresholdSvg
		? { x: fixedPoint.x, y: cursor.y }
		: cursor;
};
