import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { routeOrthogonalConnector } from "../../../../../domain/state/connector/routing";
import { slideConnectorSegment } from "../slideConnectorSegment";
import {
	alignedDrawnPath,
	endpointOf,
	findDiagonal,
	makeFrame,
	segmentAxis,
	type Face,
} from "./slideConnectorSegmentHarness";

/**
 * Sweep of the promise "a route that was right-angled when stored stays right-angled, whatever the
 * endpoints do" (see alignVertexPath) over the configuration space, the way routingInvariants.test
 * sweeps the engine's own routes. Each case pins a segment of an engine route (the first drag turns
 * the drawn corners into vertices), then moves and rotates the shapes over a grid and re-aligns —
 * the sequence in which the past diagonal-segment regressions appeared, which single-shot unit
 * cases kept missing. A second drag on the re-aligned path covers edit-after-move sequences.
 */

const FACE_PAIRS: [Face, Face][] = [
	["right", "left"],
	["right", "top"],
	["bottom", "top"],
	["left", "right"],
];

const GRID = { range: 240, step: 80 };
const TARGET_ROTATIONS = [0, 90, 180];
const SOURCE_ROTATIONS = [0, 90];
const DRAG_OFFSETS = [70, -45];

describe("vertex-path invariants over the configuration space", () => {
	it("stays right-angled after pinning, for every position/rotation of both shapes", () => {
		const failures: string[] = [];

		for (const [sourceFace, targetFace] of FACE_PAIRS) {
			const initialSource = endpointOf(makeFrame(0, 0, 0), sourceFace);
			const initialTarget = endpointOf(makeFrame(300, 200, 0), targetFace);
			const enginePath = routeOrthogonalConnector(initialSource, initialTarget);

			for (
				let segmentIndex = 0;
				segmentIndex <= enginePath.length - 2;
				segmentIndex++
			) {
				const axis = segmentAxis(
					enginePath[segmentIndex],
					enginePath[segmentIndex + 1],
				);
				if (!axis) {
					continue;
				}
				// Relative offsets plus the endpoints' own lines — dropping a run exactly onto one is
				// the collapse that leaves a single corner, the hardest case to keep right-angled.
				const dragValues = new Set([
					...DRAG_OFFSETS.map(
						(offset) => enginePath[segmentIndex][axis] + offset,
					),
					initialSource.point[axis],
					initialTarget.point[axis],
				]);
				for (const dragValue of dragValues) {
					const vertices = slideConnectorSegment(
						enginePath,
						segmentIndex,
						axis,
						dragValue,
					);
					if (vertices.length === 0) {
						continue;
					}

					for (let dx = -GRID.range; dx <= GRID.range; dx += GRID.step) {
						for (let dy = -GRID.range; dy <= GRID.range; dy += GRID.step) {
							for (const targetRotation of TARGET_ROTATIONS) {
								for (const sourceRotation of SOURCE_ROTATIONS) {
									const source = endpointOf(
										makeFrame(0, 0, sourceRotation),
										sourceFace,
									);
									const target = endpointOf(
										makeFrame(300 + dx, 200 + dy, targetRotation),
										targetFace,
									);
									const diagonal = findDiagonal(
										alignedDrawnPath(vertices, source, target),
									);
									if (diagonal) {
										failures.push(
											`${sourceFace}(rot ${sourceRotation})→${targetFace}(rot ${targetRotation}) ` +
												`drag seg ${segmentIndex} to ${dragValue}, target moved (${dx}, ${dy}): ${diagonal}`,
										);
									}
								}
							}
						}
					}
				}
			}
		}

		expect(failures.slice(0, 5), `${failures.length} configs`).toEqual([]);
	});

	it("stays right-angled through a second drag after the shapes have moved", () => {
		const failures: string[] = [];

		for (const [sourceFace, targetFace] of FACE_PAIRS) {
			const initialSource = endpointOf(makeFrame(0, 0, 0), sourceFace);
			const initialTarget = endpointOf(makeFrame(300, 200, 0), targetFace);
			const enginePath = routeOrthogonalConnector(initialSource, initialTarget);
			const firstIndex = Math.floor((enginePath.length - 2) / 2);
			const firstAxis = segmentAxis(
				enginePath[firstIndex],
				enginePath[firstIndex + 1],
			);
			if (!firstAxis) {
				continue;
			}
			const pinned: Point[] = slideConnectorSegment(
				enginePath,
				firstIndex,
				firstAxis,
				enginePath[firstIndex][firstAxis] + 70,
			);

			for (let dx = -GRID.range; dx <= GRID.range; dx += GRID.step) {
				for (let dy = -GRID.range; dy <= GRID.range; dy += GRID.step) {
					const source = endpointOf(makeFrame(0, 0, 0), sourceFace);
					const target = endpointOf(
						makeFrame(300 + dx, 200 + dy, 0),
						targetFace,
					);
					const moved = alignedDrawnPath(pinned, source, target);

					// Drag every still-draggable segment of the re-aligned path in turn.
					for (
						let segmentIndex = 0;
						segmentIndex <= moved.length - 2;
						segmentIndex++
					) {
						const axis = segmentAxis(
							moved[segmentIndex],
							moved[segmentIndex + 1],
						);
						if (!axis) {
							continue;
						}
						const redragged = slideConnectorSegment(
							moved,
							segmentIndex,
							axis,
							moved[segmentIndex][axis] + 40,
						);
						if (redragged.length === 0) {
							continue;
						}
						const diagonal = findDiagonal(
							alignedDrawnPath(redragged, source, target),
						);
						if (diagonal) {
							failures.push(
								`${sourceFace}→${targetFace} target moved (${dx}, ${dy}), ` +
									`redrag seg ${segmentIndex}: ${diagonal}`,
							);
						}
					}
				}
			}
		}

		expect(failures.slice(0, 5), `${failures.length} configs`).toEqual([]);
	});
});
