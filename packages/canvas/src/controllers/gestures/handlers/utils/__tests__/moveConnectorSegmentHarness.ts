import {
	calcFrameBoxFeatures,
	type Point,
	type TransformedFrame,
} from "@workspace/geometry";

import { alignVertexPath } from "../../../../../presentations/layers/content/utils/routing";
import type { OrthogonalConnectorEndpoint } from "../../../../../presentations/layers/content/utils/routing";
import {
	calcConnectPoint,
	calcConnectPointDirection,
} from "../../../../../presentations/objects/utils/calcConnectPoint";
import type { ConnectPointId } from "../../../../../schemas/objects/types/EndpointRef";

/**
 * Shared harness for the moveConnectorSegment property tests: the .invariants sweep over the
 * configuration space and the .fuzz run over operation sequences (the same role routingHarness plays).
 *
 * Endpoints are built the way the app resolves them: point and outward direction come from the
 * same `calcConnectPoint` / `calcConnectPointDirection` the renderer uses (no outline or anchor
 * region here, so both reduce to the face midpoint and its normal). The defect finders are the
 * machine checks for the promise the drag utils make — a stored route is nothing but real right
 * angles, and a drawn route never goes diagonal.
 */

export type Face = "top" | "bottom" | "left" | "right";
export const FACES: Face[] = ["top", "bottom", "left", "right"];

const FACE_KEY: Record<Face, ConnectPointId> = {
	top: "topCenter",
	bottom: "bottomCenter",
	left: "leftCenter",
	right: "rightCenter",
};

const SIZE = 100;

/** A `SIZE`×`SIZE` frame centred at (cx, cy). `rotation` is in degrees (0 = axis-aligned). */
export const makeFrame = (
	cx: number,
	cy: number,
	rotation: number,
): TransformedFrame => ({
	cx,
	cy,
	width: SIZE,
	height: SIZE,
	rotation,
	scaleX: 1,
	scaleY: 1,
});

export const endpointOf = (
	frame: TransformedFrame,
	face: Face,
): OrthogonalConnectorEndpoint => ({
	point: calcConnectPoint(frame, FACE_KEY[face]),
	direction: calcConnectPointDirection(frame, FACE_KEY[face]),
	box: calcFrameBoxFeatures(frame),
});

const EPS = 1e-6;

/**
 * Segment orientation of an exactly axis-aligned drawn path: the coordinate a drag of it would
 * change ("y" for a horizontal segment). Null for diagonal or zero-length segments.
 */
export const segmentAxis = (start: Point, end: Point): "x" | "y" | null => {
	if (start.y === end.y && start.x !== end.x) {
		return "y";
	}
	if (start.x === end.x && start.y !== end.y) {
		return "x";
	}
	return null;
};

const describePath = (path: Point[]): string =>
	path.map((p) => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" ");

/** The first diagonal segment of the path, or null when every segment is axis-aligned. */
export const findDiagonal = (path: Point[]): string | null => {
	for (let i = 1; i < path.length; i++) {
		const dx = Math.abs(path[i].x - path[i - 1].x);
		const dy = Math.abs(path[i].y - path[i - 1].y);
		if (dx > EPS && dy > EPS) {
			return `diagonal at ${i - 1}→${i}: ${describePath(path)}`;
		}
	}
	return null;
};

/**
 * The stricter check for a freshly stored path (right after a drag): on top of no diagonals,
 * zero-length segments and colinear adjacent segments are defects too — every stored corner has
 * to be a real right angle (see moveConnectorSegment).
 */
export const findStoredDefect = (path: Point[]): string | null => {
	const diagonal = findDiagonal(path);
	if (diagonal) {
		return diagonal;
	}
	for (let i = 1; i < path.length; i++) {
		const dx = Math.abs(path[i].x - path[i - 1].x);
		const dy = Math.abs(path[i].y - path[i - 1].y);
		if (dx <= EPS && dy <= EPS) {
			return `zero-length at ${i - 1}→${i}: ${describePath(path)}`;
		}
	}
	for (let i = 1; i < path.length - 1; i++) {
		const sameX =
			Math.abs(path[i - 1].x - path[i].x) <= EPS &&
			Math.abs(path[i + 1].x - path[i].x) <= EPS;
		const sameY =
			Math.abs(path[i - 1].y - path[i].y) <= EPS &&
			Math.abs(path[i + 1].y - path[i].y) <= EPS;
		if (sameX || sameY) {
			return `colinear vertex at ${i}: ${describePath(path)}`;
		}
	}
	return null;
};

/** Re-aligns stored vertices to the current endpoints and returns the full drawn path. */
export const alignedDrawnPath = (
	vertices: Point[],
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
): Point[] => [
	source.point,
	...alignVertexPath(
		vertices,
		source.point,
		target.point,
		source.direction,
		target.direction,
	),
	target.point,
];
