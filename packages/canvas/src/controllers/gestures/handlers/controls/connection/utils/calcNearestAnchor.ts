import {
	calcEuclideanDistance,
	calcFrameKeyPoints,
	isTransformedFrame,
} from "@workspace/geometry";

import type {
	CenterAnchorSpec,
	ConnectPointAnchorSpec,
	ConnectPointId,
} from "../../../../../../schemas/objects/types/EndpointRef";

/**
 * Specifies anchors to exclude from the candidate set. Used to avoid a
 * self-loop connecting to "the same anchor as the fixed side" or degenerating
 * into a center-to-center pair.
 */
export type AnchorExclusion = {
	/** Exclude center from the candidates. */
	center?: boolean;
	/** Exclude this connectPoint from the candidates. */
	connectPointId?: ConnectPointId;
};

/**
 * Returns the anchor nearest to the cursor position.
 * Objects with a frame choose from the 4 edge midpoints + center; objects
 * without a frame return center.
 *
 * Passing `exclude` drops the matching anchor from the candidates (used in a
 * self-loop to avoid the fixed-side anchor or center so the connection always
 * lands on a different edge midpoint).
 */
export function calcNearestAnchor(
	obj: { cx?: number; cy?: number; [key: string]: unknown },
	cursorX: number,
	cursorY: number,
	exclude?: AnchorExclusion,
): CenterAnchorSpec | ConnectPointAnchorSpec {
	if (!isTransformedFrame(obj)) {
		return { kind: "center" };
	}

	const keyPoints = calcFrameKeyPoints(obj);

	const allCandidates: Array<{
		id: ConnectPointId | null;
		x: number;
		y: number;
	}> = [
		{ id: null, x: obj.cx, y: obj.cy },
		{ id: "topCenter", x: keyPoints.topCenter.x, y: keyPoints.topCenter.y },
		{
			id: "rightCenter",
			x: keyPoints.rightCenter.x,
			y: keyPoints.rightCenter.y,
		},
		{
			id: "bottomCenter",
			x: keyPoints.bottomCenter.x,
			y: keyPoints.bottomCenter.y,
		},
		{
			id: "leftCenter",
			x: keyPoints.leftCenter.x,
			y: keyPoints.leftCenter.y,
		},
	];

	const candidates = allCandidates.filter((c) => {
		if (c.id === null) {
			return !exclude?.center;
		}
		return c.id !== exclude?.connectPointId;
	});

	// Exclusion never empties the candidates (at most 2 of the 5 anchors are
	// removed), but fall back to center defensively.
	if (candidates.length === 0) {
		return { kind: "center" };
	}

	let nearest = candidates[0];
	let minDist = calcEuclideanDistance(cursorX, cursorY, nearest.x, nearest.y);

	for (let i = 1; i < candidates.length; i++) {
		const c = candidates[i];
		const dist = calcEuclideanDistance(cursorX, cursorY, c.x, c.y);
		if (dist < minDist) {
			minDist = dist;
			nearest = c;
		}
	}

	return nearest.id === null
		? { kind: "center" }
		: { kind: "connectPoint", id: nearest.id };
}
