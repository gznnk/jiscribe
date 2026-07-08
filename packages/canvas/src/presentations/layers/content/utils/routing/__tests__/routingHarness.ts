import {
	calcFrameBoxFeatures,
	snapToDirection,
	type BoxFeatures,
	type Point,
} from "@workspace/geometry";

import { routeOrthogonalConnector } from "..";
import { countBoxCrossings, countReversals } from "../routeCost";
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

/** A 100×100 box centred at (cx, cy). */
export const boxAt = (cx: number, cy: number): BoxFeatures =>
	calcFrameBoxFeatures({
		cx,
		cy,
		width: SIZE,
		height: SIZE,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	});

/** The connect point on a box's face (edge centre). */
const facePoint = (
	box: BoxFeatures,
	cx: number,
	cy: number,
	face: Face,
): Point => {
	switch (face) {
		case "top":
			return { x: cx, y: box.top };
		case "bottom":
			return { x: cx, y: box.bottom };
		case "left":
			return { x: box.left, y: cy };
		case "right":
			return { x: box.right, y: cy };
	}
};

/** Builds an endpoint from a box centre and a face (direction inferred as the app does). */
export const endpoint = (
	cx: number,
	cy: number,
	face: Face,
): OrthogonalConnectorEndpoint => {
	const box = boxAt(cx, cy);
	const point = facePoint(box, cx, cy, face);
	return { point, direction: snapToDirection(point.x - cx, point.y - cy), box };
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

export type ConfigMeasure = {
	sourceFace: Face;
	targetFace: Face;
	dx: number;
	dy: number;
	overlap: boolean;
	crossings: number;
	reversals: number;
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
): ConfigMeasure => {
	const source = endpoint(0, 0, sourceFace);
	const target = endpoint(dx, dy, targetFace);
	const path = routeOrthogonalConnector(source, target);
	// crossings/reversals are measured on the full drawn path
	const crossings = countBoxCrossings(path, source.box, target.box);
	return {
		sourceFace,
		targetFace,
		dx,
		dy,
		overlap: boxesOverlap(0, 0, dx, dy),
		crossings,
		reversals: countReversals(path),
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
	const source = boxAt(0, 0);
	const target = boxAt(m.dx, m.dy);
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

/** Enumerates every face-pair over the relative-position grid and measures each. */
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

export { MARGIN, countTurns };
