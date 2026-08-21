import type { ConnectPointId } from "@jiscribe/doc/model/objects/types/EndpointRef";
import {
	calcFrameBoxFeatures,
	degreesToRadians,
	type BoxFeatures,
	type Point,
	type TransformedFrame,
} from "@jiscribe/geometry";

import { routeOrthogonalConnector } from "..";
import {
	calcConnectPoint,
	calcConnectPointDirection,
} from "../../../../../objects/utils/calcConnectPoint";
import { countReversals } from "../routeCost";
import type { OrthogonalConnectorEndpoint } from "../types";

/**
 * Verification harness for orthogonal connector routing.
 *
 * The recurring "degradation" reports are all about behaviour over the continuous configuration
 * space (a shape being dragged), which snapshot tests miss. This harness enumerates the space —
 * every face-pair over a grid of relative positions — routes each config, and measures the concrete
 * anti-patterns as machine-checkable quantities so regressions surface automatically.
 */

export type Face = "top" | "bottom" | "left" | "right";
export const FACES: Face[] = ["top", "bottom", "left", "right"];

const MARGIN = 30;
const SIZE = 100;

const FACE_KEY: Record<Face, ConnectPointId> = {
	top: "topCenter",
	bottom: "bottomCenter",
	left: "leftCenter",
	right: "rightCenter",
};

/**
 * Builds an endpoint exactly as the app resolves it: point and outward direction come from the
 * same `calcConnectPoint` / `calcConnectPointDirection` the renderer uses (no outline or anchor
 * region here, so both reduce to the face midpoint and its normal), and the box is the AABB of
 * the (rotated) frame. `rotation` is in degrees (0 = axis-aligned).
 */
export const endpoint = (
	cx: number,
	cy: number,
	face: Face,
	rotation = 0,
): OrthogonalConnectorEndpoint => {
	const frame: TransformedFrame = {
		cx,
		cy,
		width: SIZE,
		height: SIZE,
		rotation,
		scaleX: 1,
		scaleY: 1,
	};
	const box = calcFrameBoxFeatures(frame);
	return {
		point: calcConnectPoint(frame, FACE_KEY[face]),
		direction: calcConnectPointDirection(frame, FACE_KEY[face]),
		box,
	};
};

/** Whether the two 100×100 boxes (centres given) overlap (a semi-degenerate input). */
export const boxesOverlap = (
	sx: number,
	sy: number,
	tx: number,
	ty: number,
): boolean => Math.abs(sx - tx) < SIZE && Math.abs(sy - ty) < SIZE;

/** Turn count = interior corners of the full path. */
const countTurns = (path: Point[]): number => Math.max(path.length - 2, 0);

/** The four corners of a rotated `size×size` shape centred at (cx, cy). */
const rotatedCorners = (cx: number, cy: number, rotation: number): Point[] => {
	const r = degreesToRadians(rotation);
	const c = Math.cos(r);
	const s = Math.sin(r);
	const h = SIZE / 2;
	return [
		[-h, -h],
		[h, -h],
		[h, h],
		[-h, h],
	].map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c }));
};

/** Ray-casting point-in-polygon. */
const pointInPolygon = (p: Point, poly: Point[]): boolean => {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i];
		const b = poly[j];
		if (
			a.y > p.y !== b.y > p.y &&
			p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
		) {
			inside = !inside;
		}
	}
	return inside;
};

/**
 * Whether a segment passes through the interior of the (possibly rotated) shape. Measured against the
 * true rotated polygon, not the AABB — for a rotated shape the connect point sits inside the AABB, so
 * an AABB test would flag every legitimate exit leg. Interior samples exclude the endpoints, so a leg
 * that merely starts on the outline and heads outward does not count.
 */
const segmentEntersShape = (a: Point, b: Point, poly: Point[]): boolean => {
	const samples = 24;
	for (let k = 1; k < samples; k++) {
		const t = k / samples;
		if (
			pointInPolygon(
				{ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
				poly,
			)
		) {
			return true;
		}
	}
	return false;
};

/** Number of full-path segments that pass through either shape's true (rotated) interior. */
const countShapeCrossings = (
	path: Point[],
	sourcePoly: Point[],
	targetPoly: Point[],
): number => {
	let n = 0;
	for (let i = 0; i < path.length - 1; i++) {
		if (
			segmentEntersShape(path[i], path[i + 1], sourcePoly) ||
			segmentEntersShape(path[i], path[i + 1], targetPoly)
		) {
			n++;
		}
	}
	return n;
};

/**
 * Minimum clearance between an axis-aligned segment and a box (0 if it touches or enters).
 * Used to measure how close a pass-by segment runs to a shape.
 */
const segmentBoxClearance = (
	p1: Point,
	p2: Point,
	box: BoxFeatures,
): number => {
	const segMinX = Math.min(p1.x, p2.x);
	const segMaxX = Math.max(p1.x, p2.x);
	const segMinY = Math.min(p1.y, p2.y);
	const segMaxY = Math.max(p1.y, p2.y);
	// gap on each axis between the segment's extent and the box (negative → overlapping on that axis)
	const dx = Math.max(box.left - segMaxX, segMinX - box.right, 0);
	const dy = Math.max(box.top - segMaxY, segMinY - box.bottom, 0);
	return Math.max(dx, dy);
};

/**
 * Backtrack spikes tolerant of a small perpendicular jog. `countReversals` only flags a strict
 * collinear out-and-back (three points on one line); a rotated shape yields connect points a few px
 * off, so the out-and-back gets a tiny perpendicular jog and slips past it. This counts a horizontal
 * (or vertical) segment that opposes the previous one on the same axis when the perpendicular travel
 * between them is ≤ `tolerance` — a spike — while a genuine wrap (large perpendicular excursion) is
 * not flagged.
 */
export const netBacktracks = (path: Point[], tolerance = MARGIN): number => {
	let count = 0;
	let prevHDir = 0;
	let prevVDir = 0;
	let perpSinceH = 0; // perpendicular (vertical) travel since the last horizontal segment
	let perpSinceV = 0; // perpendicular (horizontal) travel since the last vertical segment
	for (let i = 1; i < path.length; i++) {
		const dx = path[i].x - path[i - 1].x;
		const dy = path[i].y - path[i - 1].y;
		if (dx !== 0) {
			const dir = Math.sign(dx);
			if (prevHDir !== 0 && dir !== prevHDir && perpSinceH <= tolerance) {
				count++;
			}
			prevHDir = dir;
			perpSinceH = 0;
			perpSinceV += Math.abs(dx);
		}
		if (dy !== 0) {
			const dir = Math.sign(dy);
			if (prevVDir !== 0 && dir !== prevVDir && perpSinceV <= tolerance) {
				count++;
			}
			prevVDir = dir;
			perpSinceV = 0;
			perpSinceH += Math.abs(dy);
		}
	}
	return count;
};

export type ConfigMeasure = {
	sourceFace: Face;
	targetFace: Face;
	dx: number;
	dy: number;
	sourceRot: number;
	targetRot: number;
	overlap: boolean;
	crossings: number;
	reversals: number;
	backtracks: number;
	turns: number;
	points: number;
	path: Point[];
	signature: string;
};

const signatureOf = (path: Point[]): string => {
	let s = "";
	for (let i = 1; i < path.length; i++) {
		const ddx = path[i].x - path[i - 1].x;
		const ddy = path[i].y - path[i - 1].y;
		if (ddx === 0 && ddy === 0) {
			continue;
		}
		s +=
			Math.abs(ddx) >= Math.abs(ddy)
				? ddx > 0
					? "R"
					: "L"
				: ddy > 0
					? "D"
					: "U";
	}
	return s;
};

/** Routes and measures one configuration (source box at origin, target box at (dx, dy)). */
export const measure = (
	sourceFace: Face,
	targetFace: Face,
	dx: number,
	dy: number,
	sourceRot = 0,
	targetRot = 0,
): ConfigMeasure => {
	const source = endpoint(0, 0, sourceFace, sourceRot);
	const target = endpoint(dx, dy, targetFace, targetRot);
	const path = routeOrthogonalConnector(source, target);
	// crossings are measured against the true (rotated) polygons, on the full drawn path
	const crossings = countShapeCrossings(
		path,
		rotatedCorners(0, 0, sourceRot),
		rotatedCorners(dx, dy, targetRot),
	);
	return {
		sourceFace,
		targetFace,
		dx,
		dy,
		sourceRot,
		targetRot,
		overlap: boxesOverlap(0, 0, dx, dy),
		crossings,
		reversals: countReversals(path),
		backtracks: netBacktracks(path),
		turns: countTurns(path),
		points: path.length,
		path,
		signature: signatureOf(path),
	};
};

/**
 * The minimum clearance any **pass-by** segment keeps from a box it routes past. A segment is a
 * pass-by for a given box only if it is not the segment incident to that box's own endpoint (that
 * one is the exit/entry corridor, which is legitimately close to the face). This mirrors the spec's
 * exit-corridor exclusion so the metric measures real grazes, not the natural exit.
 */
export const minPassByClearance = (m: ConfigMeasure): number => {
	const source = endpoint(0, 0, m.sourceFace, m.sourceRot).box as BoxFeatures;
	const target = endpoint(m.dx, m.dy, m.targetFace, m.targetRot)
		.box as BoxFeatures;
	const last = m.path.length - 1;
	let min = Infinity;
	for (let i = 0; i < m.path.length - 1; i++) {
		const a = m.path[i];
		const b = m.path[i + 1];
		// segment 0 is incident to the source point; segment (last-1) is incident to the target point
		if (i !== 0) {
			const c = segmentBoxClearance(a, b, source);
			if (c > 0) {
				min = Math.min(min, c);
			}
		}
		if (i !== last - 1) {
			const c = segmentBoxClearance(a, b, target);
			if (c > 0) {
				min = Math.min(min, c);
			}
		}
	}
	return min;
};

/**
 * How far apart the two boxes are on their nearest axis: 0 when edge-adjacent, negative when
 * overlapping, positive when there is a gap. "Clearly separated" (gap > margin) rules out the
 * near-degenerate adjacent/touching configs from strict invariant checks.
 */
export const boxGap = (dx: number, dy: number): number =>
	Math.max(Math.abs(dx) - SIZE, Math.abs(dy) - SIZE);

export type GridOptions = {
	range: number;
	step: number;
};

/** Enumerates every face-pair over the relative-position grid and measures each (both axis-aligned). */
export const sweepGrid = ({ range, step }: GridOptions): ConfigMeasure[] => {
	const out: ConfigMeasure[] = [];
	for (const sf of FACES) {
		for (const tf of FACES) {
			for (let dx = -range; dx <= range; dx += step) {
				for (let dy = -range; dy <= range; dy += step) {
					out.push(measure(sf, tf, dx, dy));
				}
			}
		}
	}
	return out;
};

/**
 * Enumerates the grid with the **source** box rotated to each given angle (degrees), the target left
 * axis-aligned. Rotating one side is enough to exercise the AABB-vs-shape discrepancy that trips up
 * stubs and clearance; rotating both is a larger space left for later.
 */
export const sweepGridRotated = (
	{ range, step }: GridOptions,
	rotations: number[],
): ConfigMeasure[] => {
	const out: ConfigMeasure[] = [];
	for (const sf of FACES) {
		for (const tf of FACES) {
			for (const rot of rotations) {
				for (let dx = -range; dx <= range; dx += step) {
					for (let dy = -range; dy <= range; dy += step) {
						out.push(measure(sf, tf, dx, dy, rot, 0));
					}
				}
			}
		}
	}
	return out;
};

export { MARGIN, countTurns };
