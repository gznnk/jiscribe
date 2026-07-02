import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { directionsFace, elbowCandidates } from "../elbowCandidates";

const orthogonal = (pts: Point[]): boolean =>
	pts.every((p, i) =>
		i === 0 ? true : p.x === pts[i - 1].x || p.y === pts[i - 1].y,
	);

describe("directionsFace", () => {
	it("x:true when left and right face each other head-on", () => {
		expect(directionsFace("right", "left")).toEqual({ x: true, y: false });
		expect(directionsFace("left", "right")).toEqual({ x: true, y: false });
	});

	it("y:true when up and down face each other head-on", () => {
		expect(directionsFace("up", "down")).toEqual({ x: false, y: true });
		expect(directionsFace("down", "up")).toEqual({ x: false, y: true });
	});

	it("directions that don't mesh are both false", () => {
		expect(directionsFace("right", "up")).toEqual({ x: false, y: false });
		expect(directionsFace("right", "right")).toEqual({ x: false, y: false });
	});
});

describe("elbowCandidates", () => {
	const a: Point = { x: 0, y: 0 };
	const b: Point = { x: 100, y: 40 };

	it("with free endpoints, enumerates the x/y channels of both stub ends and the midpoint", () => {
		// box=null, so xs={0,100,50}, ys={0,40,20} → 3 each = 6 candidates total
		const candidates = elbowCandidates(a, b, null, null, 20, false, false);
		expect(candidates).toHaveLength(6);
		// all are 4-point [a, corner, corner, b] paths with only horizontal/vertical segments
		for (const { elbow } of candidates) {
			expect(elbow).toHaveLength(4);
			expect(elbow[0]).toEqual(a);
			expect(elbow[3]).toEqual(b);
			expect(orthogonal(elbow)).toBe(true);
		}
	});

	it("when facingX, the candidate that bends at midX has symmetric set", () => {
		const candidates = elbowCandidates(a, b, null, null, 20, true, false);
		// the vertical-channel candidate at midX = 50 is symmetric
		const symmetric = candidates.filter((c) => c.symmetric);
		expect(symmetric).toHaveLength(1);
		expect(symmetric[0].elbow).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 40 },
			{ x: 100, y: 40 },
		]);
	});

	it("with a box, the outer-clearance channels (edge ± margin) are added to the candidates", () => {
		// under the same conditions, the version with a box has more candidates (detour channels are included)
		const sourceBox = {
			left: -50,
			right: 50,
			top: -30,
			bottom: 30,
			center: { x: 0, y: 0 },
			topLeft: { x: -50, y: -30 },
			bottomLeft: { x: -50, y: 30 },
			topRight: { x: 50, y: -30 },
			bottomRight: { x: 50, y: 30 },
		};
		const withoutBox = elbowCandidates(a, b, null, null, 20, false, false);
		const withBox = elbowCandidates(a, b, sourceBox, null, 20, false, false);
		expect(withBox.length).toBeGreaterThan(withoutBox.length);
	});
});
