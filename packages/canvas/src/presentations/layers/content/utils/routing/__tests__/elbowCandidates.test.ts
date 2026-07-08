import type { BoxFeatures, Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { elbowCandidates } from "../elbowCandidates";

const orthogonal = (pts: Point[]): boolean =>
	pts.every((p, i) =>
		i === 0 ? true : p.x === pts[i - 1].x || p.y === pts[i - 1].y,
	);

/** A box spanning [left,right]×[top,bottom] with the derived corner/center fields. */
const box = (
	left: number,
	right: number,
	top: number,
	bottom: number,
): BoxFeatures => ({
	left,
	right,
	top,
	bottom,
	center: { x: (left + right) / 2, y: (top + bottom) / 2 },
	topLeft: { x: left, y: top },
	bottomLeft: { x: left, y: bottom },
	topRight: { x: right, y: top },
	bottomRight: { x: right, y: bottom },
});

describe("elbowCandidates", () => {
	const a: Point = { x: 0, y: 0 };
	const b: Point = { x: 100, y: 40 };

	it("with free endpoints, enumerates the x/y channels of both stub ends and the midpoint", () => {
		// box=null, so xs={0,100,50}, ys={0,40,20} → 3 each = 6 candidates total
		const candidates = elbowCandidates(a, b, null, null, 20);
		expect(candidates).toHaveLength(6);
		// all are 4-point [a, corner, corner, b] paths with only horizontal/vertical segments
		for (const { elbow } of candidates) {
			expect(elbow).toHaveLength(4);
			expect(elbow[0]).toEqual(a);
			expect(elbow[3]).toEqual(b);
			expect(orthogonal(elbow)).toBe(true);
		}
	});

	it("with free endpoints, the candidate bending at the stub midpoint is symmetric", () => {
		const candidates = elbowCandidates(a, b, null, null, 20);
		// no boxes → the ideal crossover falls back to the midpoint of the stubs: idealX = 50
		const symmetric = candidates.filter((c) => c.symmetric);
		expect(symmetric).toContainEqual({
			elbow: [
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
				{ x: 50, y: 40 },
				{ x: 100, y: 40 },
			],
			symmetric: true,
		});
	});

	it("with two boxes, the symmetric candidate bends at the center of the gap between them (not the stub midpoint)", () => {
		// Non-facing layout: source stub exits up at x=0, target stub enters from the left at x=100.
		// Boxes are x-separated with a gap between right=10 (source) and left=80 (target).
		// The stub midpoint would be x=50 (lopsided), but the gap center is (10+80)/2 = 45.
		const sourceBox = box(-40, 10, -40, 10);
		const targetBox = box(80, 130, 20, 60);
		const candidates = elbowCandidates(a, b, sourceBox, targetBox, 20);
		const symmetricXs = candidates
			.filter((c) => c.symmetric && c.elbow[1].x === c.elbow[2].x)
			.map((c) => c.elbow[1].x);
		expect(symmetricXs).toContain(45);
		expect(symmetricXs).not.toContain(50);
	});

	it("with a box, the outer-clearance channels (edge ± margin) are added to the candidates", () => {
		// under the same conditions, the version with a box has more candidates (detour channels are included)
		const sourceBox = box(-50, 50, -30, 30);
		const withoutBox = elbowCandidates(a, b, null, null, 20);
		const withBox = elbowCandidates(a, b, sourceBox, null, 20);
		expect(withBox.length).toBeGreaterThan(withoutBox.length);
	});
});
