import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { routeOrthogonalConnector } from "../../../../../presentations/layers/content/utils/routing";
import { slideConnectorSegment } from "../slideConnectorSegment";
import {
	alignedDrawnPath,
	endpointOf,
	FACES,
	findDiagonal,
	findStoredDefect,
	makeFrame,
	segmentAxis,
} from "./slideConnectorSegmentHarness";

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
 *   adjacent segments (every stored corner is a real right angle — see slideConnectorSegment)
 * - at any point, the drawn (aligned) path has no diagonal, whatever the shapes did
 */

/** Seeded LCG so every run replays the same sequences (failures stay reproducible). */
const lcg = (seed: number) => {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0xffffffff;
	};
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

			const drawnPath = (): Point[] => {
				const source = endpointOf(sourceFrame, sourceFace);
				const target = endpointOf(targetFrame, targetFace);
				if (vertices.length === 0) {
					return routeOrthogonalConnector(source, target);
				}
				return alignedDrawnPath(vertices, source, target);
			};

			// The commit that follows a shape operation persists the drawn (aligned) vertices,
			// rounded, back into the store (the reconcileConnectorVertices equivalent).
			const persistDrawnVertices = (stored: Point[]): Point[] => {
				if (stored.length === 0) {
					return stored;
				}
				return drawnPath()
					.slice(1, -1)
					.map((point) => ({
						x: Math.round(point.x * 10000) / 10000,
						y: Math.round(point.y * 10000) / 10000,
					}));
			};

			for (let step = 0; step < 14; step++) {
				const path = drawnPath();
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
					vertices = slideConnectorSegment(path, segmentIndex, axis, value);
					if (vertices.length > 0) {
						const source = endpointOf(sourceFrame, sourceFace);
						const target = endpointOf(targetFrame, targetFace);
						const defect = findStoredDefect([
							source.point,
							...vertices,
							target.point,
						]);
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
					vertices = persistDrawnVertices(vertices);
				} else {
					// Quarter-turn rotation
					const rotation = pick([0, 90, 180, 270]);
					if (rand() < 0.5) {
						sourceFrame = makeFrame(sourceFrame.cx, sourceFrame.cy, rotation);
					} else {
						targetFrame = makeFrame(targetFrame.cx, targetFrame.cy, rotation);
					}
					vertices = persistDrawnVertices(vertices);
				}

				if (vertices.length > 0) {
					const diagonal = findDiagonal(drawnPath());
					if (diagonal) {
						failures.push(`${label} (drawn): ${diagonal}`);
					}
				}
			}
		}

		expect(failures.slice(0, 8), `${failures.length} defects`).toEqual([]);
	});
});
