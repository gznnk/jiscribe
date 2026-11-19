import {
	calcLocalAnchorRegion,
	clampAnchorRatio,
} from "@jiscribe/doc/model/objects/connector/localAnchorRay";
import type {
	EdgeAnchorSide,
	EdgeAnchorSpec,
} from "@jiscribe/doc/model/objects/types/EndpointRef";
import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import {
	calcEuclideanDistance,
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
	type Point,
	type Rect,
	type TransformedFrame,
} from "@jiscribe/geometry";

/**
 * The edge anchor a world position rounds to — the inverse of
 * `calcEdgeAnchorPoint`, used when a connection is dropped somewhere the named
 * anchors do not cover.
 *
 * The position is taken back into the shape's local space and matched against
 * the anchor region's four sides, each treated as a segment so a position past a
 * corner still picks the side it is nearest to. The outline is deliberately not
 * consulted: it decides how far out an anchor lands, not which edge it belongs
 * to, and rounding against the same rect the forward rays start from is what
 * makes the round trip stable.
 *
 * @param frame - The shape being dropped onto; its rotation and flips are undone
 *   first, so the returned `side` names the edge in local space
 * @param worldPoint - The dropped position in world coordinates; one inside the
 *   shape projects outward to the nearest side, one outside inward to it
 * @param anchorRegion - The band to measure the ratio over, in local coordinates
 *   (from ObjectAnchorRegionRegistry). Omitted = the full bounding box
 * @returns The anchor, its ratio clamped to 0..1 and rounded for storage. Sides
 *   equally near are broken in top → right → bottom → left order, and a
 *   zero-width or zero-height region yields 0.5 on the collapsed axis
 */
export const calcEdgeAnchorFromPoint = (
	frame: TransformedFrame,
	worldPoint: Point,
	anchorRegion?: Rect | null,
): EdgeAnchorSpec => {
	const local = calcInverseAffineTransformedPoint(
		worldPoint.x,
		worldPoint.y,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
	const region = calcLocalAnchorRegion(frame, anchorRegion);
	const right = region.x + region.width;
	const bottom = region.y + region.height;

	const ratioX =
		region.width > 0
			? clampAnchorRatio((local.x - region.x) / region.width)
			: 0.5;
	const ratioY =
		region.height > 0
			? clampAnchorRatio((local.y - region.y) / region.height)
			: 0.5;
	// The projection onto each side, clamped to the side's own extent.
	const alongX = region.x + region.width * ratioX;
	const alongY = region.y + region.height * ratioY;

	const candidates: Array<{ side: EdgeAnchorSide; t: number; gap: number }> = [
		{
			side: "top",
			t: ratioX,
			gap: calcEuclideanDistance(local.x, local.y, alongX, region.y),
		},
		{
			side: "right",
			t: ratioY,
			gap: calcEuclideanDistance(local.x, local.y, right, alongY),
		},
		{
			side: "bottom",
			t: ratioX,
			gap: calcEuclideanDistance(local.x, local.y, alongX, bottom),
		},
		{
			side: "left",
			t: ratioY,
			gap: calcEuclideanDistance(local.x, local.y, region.x, alongY),
		},
	];

	let nearest = candidates[0];
	for (const candidate of candidates) {
		if (candidate.gap < nearest.gap) {
			nearest = candidate;
		}
	}

	return {
		kind: "edge",
		side: nearest.side,
		t: roundToDecimal(nearest.t, PRECISION.COORDINATE),
	};
};
