import {
	calcFrameBoxFeatures,
	type Point,
	type TransformedFrame,
} from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import {
	alignVertexPath,
	routeOrthogonalConnector,
} from "../../../../../presentations/layers/content/utils/routing";
import type { OrthogonalConnectorEndpoint } from "../../../../../presentations/layers/content/utils/routing";
import {
	calcConnectPoint,
	calcConnectPointDirection,
} from "../../../../../presentations/objects/utils/calcConnectPoint";
import { moveConnectorSegment } from "../moveConnectorSegment";

/**
 * Deterministic fuzz over operation *sequences*: seeded random chains of segment drags, shape
 * moves and quarter-turn rotations, with drag values that include exact drops onto the endpoints'
 * lines and onto parallel segments' lines — the collapses hand-picked cases keep missing.
 *
 * The single-example tests pin behaviours; the .invariants sweep covers the configuration space
 * after ONE drag; this file covers what only sequences reach (a cleanup that is correct per step
 * can still leave debris that the next step trips over — the fixpoint bug in cleanedUp was found
 * exactly here). Invariants checked:
 *
 * - right after a drag, the stored path has no diagonal, no zero-length segment and no colinear
 *   adjacent segments (every stored corner is a real right angle — moveConnectorSegment 参照)
 * - at any point, the drawn (aligned) path has no diagonal, whatever the shapes did
 */

type Face = "top" | "bottom" | "left" | "right";
const FACES: Face[] = ["top", "bottom", "left", "right"];
const FACE_KEY = {
	top: "topCenter",
	bottom: "bottomCenter",
	left: "leftCenter",
	right: "rightCenter",
} as const;

const makeFrame = (
	cx: number,
	cy: number,
	rotation: number,
): TransformedFrame => ({
	cx,
	cy,
	width: 100,
	height: 100,
	rotation,
	scaleX: 1,
	scaleY: 1,
});

const endpointOf = (
	frame: TransformedFrame,
	face: Face,
): OrthogonalConnectorEndpoint => ({
	point: calcConnectPoint(frame, FACE_KEY[face]),
	direction: calcConnectPointDirection(frame, FACE_KEY[face]),
	box: calcFrameBoxFeatures(frame),
});

const EPS = 1e-6;

/** Seeded LCG so every run replays the same sequences (failures stay reproducible). */
const lcg = (seed: number) => {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0xffffffff;
	};
};

const segmentAxis = (a: Point, b: Point): "x" | "y" | null => {
	if (a.y === b.y && a.x !== b.x) {
		return "y";
	}
	if (a.x === b.x && a.y !== b.y) {
		return "x";
	}
	return null;
};

const describePath = (path: Point[]): string =>
	path.map((p) => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" ");

const findDiagonal = (path: Point[]): string | null => {
	for (let i = 1; i < path.length; i++) {
		const dx = Math.abs(path[i].x - path[i - 1].x);
		const dy = Math.abs(path[i].y - path[i - 1].y);
		if (dx > EPS && dy > EPS) {
			return `diagonal at ${i - 1}→${i}: ${describePath(path)}`;
		}
	}
	return null;
};

/** Checked only right after a drag: zero-length and colinear-adjacent segments are defects too. */
const findStoredDefect = (path: Point[]): string | null => {
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

describe("fuzz: drag/move/rotate operation sequences", () => {
	it("keeps every stored corner a right angle and every drawn path diagonal-free", () => {
		const failures: string[] = [];

		for (let trial = 0; trial < 500; trial++) {
			const rand = lcg(1000 + trial);
			const pick = <T>(list: readonly T[]): T =>
				list[Math.floor(rand() * list.length) % list.length];

			const sourceFace = pick(FACES);
			const targetFace = pick(FACES);
			let sourceFrame = makeFrame(0, 0, 0);
			let targetFrame = makeFrame(
				150 + Math.floor(rand() * 300),
				-100 + Math.floor(rand() * 400),
				0,
			);
			let vertices: Point[] = [];

			const drawnPath = (): Point[] | null => {
				const source = endpointOf(sourceFrame, sourceFace);
				const target = endpointOf(targetFrame, targetFace);
				if (vertices.length === 0) {
					return routeOrthogonalConnector(source, target);
				}
				return [
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
			};

			for (let step = 0; step < 14; step++) {
				const path = drawnPath();
				if (!path) {
					continue;
				}
				const label = `trial ${trial} step ${step} ${sourceFace}→${targetFace}`;

				const operation = rand();
				if (operation < 0.6) {
					// Segment drag. Values mix free offsets, tiny nudges, the endpoints' own lines
					// and every parallel segment's line — exact drops are the collapse cases.
					const candidates = path
						.map((_, i) => i)
						.filter(
							(i) =>
								i <= path.length - 2 &&
								segmentAxis(path[i], path[i + 1]) !== null,
						);
					if (candidates.length === 0) {
						continue;
					}
					const segmentIndex = pick(candidates);
					const axis = segmentAxis(
						path[segmentIndex],
						path[segmentIndex + 1],
					) as "x" | "y";
					const valuePool: number[] = [
						path[segmentIndex][axis] + (rand() * 600 - 300),
						path[segmentIndex][axis] + (rand() < 0.5 ? 5 : -5),
						path[0][axis],
						path[path.length - 1][axis],
						path[segmentIndex][axis],
					];
					for (let k = 0; k <= path.length - 2; k++) {
						if (segmentAxis(path[k], path[k + 1]) === axis) {
							valuePool.push(path[k][axis]);
						}
					}
					const value = pick(valuePool);
					vertices = moveConnectorSegment(path, segmentIndex, axis, value);
					if (vertices.length > 0) {
						const source = endpointOf(sourceFrame, sourceFace);
						const target = endpointOf(targetFrame, targetFace);
						const stored = [source.point, ...vertices, target.point];
						const defect = findStoredDefect(stored);
						if (defect) {
							failures.push(
								`${label} drag seg ${segmentIndex} ${axis}→${value.toFixed(2)}: ${defect}`,
							);
						}
					}
				} else if (operation < 0.85) {
					// Shape move
					const dx = Math.floor(rand() * 9 - 4) * 60;
					const dy = Math.floor(rand() * 9 - 4) * 60;
					if (rand() < 0.5) {
						sourceFrame = makeFrame(
							sourceFrame.cx + dx,
							sourceFrame.cy + dy,
							sourceFrame.rotation,
						);
					} else {
						targetFrame = makeFrame(
							targetFrame.cx + dx,
							targetFrame.cy + dy,
							targetFrame.rotation,
						);
					}
				} else {
					// Quarter-turn rotation
					const rotation = pick([0, 90, 180, 270]);
					if (rand() < 0.5) {
						sourceFrame = makeFrame(sourceFrame.cx, sourceFrame.cy, rotation);
					} else {
						targetFrame = makeFrame(targetFrame.cx, targetFrame.cy, rotation);
					}
				}

				const after = drawnPath();
				if (after && vertices.length > 0) {
					const diagonal = findDiagonal(after);
					if (diagonal) {
						failures.push(`${label} (drawn): ${diagonal}`);
					}
				}
			}
		}

		expect(failures.slice(0, 8), `${failures.length} defects`).toEqual([]);
	});
});
