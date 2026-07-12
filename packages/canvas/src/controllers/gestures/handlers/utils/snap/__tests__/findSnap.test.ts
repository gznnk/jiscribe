import { describe, it, expect } from "vitest";

import type { SnapCandidate, SnapCandidates } from "../../../../../CanvasTypes";
import { buildSnapFeedback, findSnap, SNAP_THRESHOLD_PX } from "../findSnap";

/** Helper that builds a target candidate (a snap target). */
const xCandidate = (
	coordinate: number,
	edge: SnapCandidate["edge"],
	objectId = "target",
): SnapCandidate => ({
	objectId,
	coordinate,
	edge,
	perpendicularMin: 0,
	perpendicularMax: 100,
});

describe("findSnap - center snap", () => {
	const threshold = SNAP_THRESHOLD_PX; // equivalent to zoom=1

	it("center↔center: the drag center snaps to another object's center line", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "hCenter")],
			y: [],
		};
		// BBox being dragged: left=86, right=110 → centerX=98 (distance 2 to candidate 100)
		const result = findSnap(candidates, threshold, [86, 98, 110], []);

		expect(result.delta.x).toBe(2); // 98 → 100
		expect(result.xResult?.snapCoordinate).toBe(100);
	});

	it("center↔edge: the drag center snaps to another object's edge", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(50, "left")],
			y: [],
		};
		// centerX=52 → distance 2 to candidate 50
		const result = findSnap(candidates, threshold, [40, 52, 64], []);

		expect(result.delta.x).toBe(-2); // 52 → 50
	});

	it("edge↔center: the drag edge snaps to another object's center line", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(200, "hCenter")],
			y: [],
		};
		// left=203 → distance 3 to candidate 200; centerX=233 / right=263 are out of range
		const result = findSnap(candidates, threshold, [203, 233, 263], []);

		expect(result.delta.x).toBe(-3); // 203 → 200
	});

	it("the nearest wins (picks an edge if it is closer than the center)", () => {
		// findSnap assumes candidates already sorted ascending by coordinate (guaranteed by calcSnapCandidates)
		const candidates: SnapCandidates = {
			x: [xCandidate(91, "left"), xCandidate(100, "hCenter")],
			y: [],
		};
		// left=90 → distance 1 to candidate 91; centerX=98 → distance 2 to candidate 100
		const result = findSnap(candidates, threshold, [90, 98, 106], []);

		expect(result.xResult?.snapCoordinate).toBe(91); // the closer edge
		expect(result.delta.x).toBe(1);
	});

	it("buildSnapFeedback: generates a center-line guide when the centers align", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "hCenter")],
			y: [],
		};
		const result = findSnap(candidates, threshold, [86, 98, 110], []);
		// BBox after the snap is applied (centerX becomes 100)
		const actualBBox = { left: 88, right: 112, top: 0, bottom: 24 };

		const feedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			candidates,
		);

		expect(feedback.x).toHaveLength(1);
		expect(feedback.x[0].coordinate).toBe(100);
		expect(feedback.x[0].sourceObjectIds).toContain("target");
	});
});

describe("findSnap - exclusion set (excludeIds)", () => {
	const threshold = SNAP_THRESHOLD_PX;

	it("objectIds in excludeIds are excluded from snapping", () => {
		// The nearest (101) is the dragged object itself, so exclude it and snap to the next nearest, 110
		const candidates: SnapCandidates = {
			x: [xCandidate(101, "left", "self"), xCandidate(110, "left", "other")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[103],
			[],
			new Set(["self"]),
		);

		expect(result.xResult?.snapCoordinate).toBe(110);
		expect(result.delta.x).toBe(7);
	});

	it("does not snap when the exclusion leaves no candidate within the threshold", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(101, "left", "self")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[103],
			[],
			new Set(["self"]),
		);

		expect(result.xResult).toBeNull();
		expect(result.delta.x).toBe(0);
	});

	it("buildSnapFeedback also excludes excludeIds candidates from the guides", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "left", "self"), xCandidate(100, "left", "other")],
			y: [],
		};
		const result = findSnap(
			candidates,
			threshold,
			[100],
			[],
			new Set(["self"]),
		);
		const actualBBox = { left: 100, right: 100, top: 0, bottom: 24 };

		const feedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			candidates,
			new Set(["self"]),
		);

		expect(feedback.x).toHaveLength(1);
		expect(feedback.x[0].sourceObjectIds).toEqual(["other"]);
	});
});

describe("findSnap - binary search (many candidates, tie-breaking)", () => {
	const threshold = SNAP_THRESHOLD_PX;

	it("picks the nearest from many sorted candidates", () => {
		const coords = [0, 50, 100, 150, 200, 250, 300, 350, 400];
		const candidates: SnapCandidates = {
			x: coords.map((c) => xCandidate(c, "left", `obj-${c}`)),
			y: [],
		};
		// The nearest to 203 is 200 (distance 3)
		const result = findSnap(candidates, threshold, [203], []);

		expect(result.xResult?.snapCoordinate).toBe(200);
		expect(result.delta.x).toBe(-3);
	});

	it("prefers the smaller coordinate on a tie (preserving the linear version's tie-break)", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(98, "left"), xCandidate(102, "right")],
			y: [],
		};
		// Candidates equidistant (2) on both sides of 100; pick the smaller, 98
		const result = findSnap(candidates, threshold, [100], []);

		expect(result.xResult?.snapCoordinate).toBe(98);
		expect(result.delta.x).toBe(-2);
	});

	it("does not snap exactly at the threshold (= is strict less)", () => {
		const candidates: SnapCandidates = {
			x: [xCandidate(100, "left")],
			y: [],
		};
		// Does not snap when the distance equals the threshold
		const result = findSnap(candidates, threshold, [100 + threshold], []);

		expect(result.xResult).toBeNull();
	});
});
