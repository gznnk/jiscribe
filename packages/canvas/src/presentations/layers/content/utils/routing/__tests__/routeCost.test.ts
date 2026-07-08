import { calcFrameBoxFeatures, type BoxFeatures } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import {
	calcRouteCost,
	compareCost,
	countBoxCrossings,
	countReversals,
} from "../routeCost";

// center (100,100) 100x60 → AABB: left50 right150 top70 bottom130
const box: BoxFeatures = calcFrameBoxFeatures({
	cx: 100,
	cy: 100,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

describe("countReversals", () => {
	it("counts intermediate points that reverse along the same axis as reversals", () => {
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 50, y: 0 },
			]),
		).toBe(1);
	});

	it("going straight or turning at a right angle is not a reversal", () => {
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		).toBe(0);
		expect(
			countReversals([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 100 },
			]),
		).toBe(0);
	});
});

describe("countBoxCrossings", () => {
	it("counts segments that pass through the box", () => {
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 100 },
					{ x: 200, y: 100 },
				],
				box,
				null,
			),
		).toBe(1);
	});

	it("does not count segments that pass outside the box", () => {
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 0 },
					{ x: 200, y: 0 },
				],
				box,
				null,
			),
		).toBe(0);
	});

	it("also counts a vertical segment crossing as 1", () => {
		// x=100 is inside (left50, right150), y crosses top70/bottom130
		expect(
			countBoxCrossings(
				[
					{ x: 100, y: 0 },
					{ x: 100, y: 200 },
				],
				box,
				null,
			),
		).toBe(1);
	});

	it("does not count segments that merely lie on or touch an edge (touching is not crossing)", () => {
		// horizontal line lying on the top edge y=70
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 70 },
					{ x: 200, y: 70 },
				],
				box,
				null,
			),
		).toBe(0);
		// horizontal line that stops at the left edge x=50 (does not cross)
		expect(
			countBoxCrossings(
				[
					{ x: 0, y: 100 },
					{ x: 50, y: 100 },
				],
				box,
				null,
			),
		).toBe(0);
	});
});

describe("compareCost", () => {
	it("crossing count takes top priority (any crossing loses no matter how good the aesthetics)", () => {
		const crossing = {
			crossings: 1,
			reversals: 0,
			intrusions: 0,
			aesthetic: 0,
		};
		const clean = {
			crossings: 0,
			reversals: 0,
			intrusions: 0,
			aesthetic: 9_999,
		};
		// compareCost(a,b) < 0 means a is better
		expect(compareCost(clean, crossing)).toBeLessThan(0);
	});

	it("reversals rank above intrusions and aesthetics (a spike loses even with better clearance)", () => {
		const spike = { crossings: 0, reversals: 1, intrusions: 0, aesthetic: 0 };
		const clean = {
			crossings: 0,
			reversals: 0,
			intrusions: 1,
			aesthetic: 9_999,
		};
		expect(compareCost(clean, spike)).toBeLessThan(0);
	});

	it("margin intrusions rank above the aesthetic (a fuller-clearance route wins even if longer)", () => {
		const grazing = {
			crossings: 0,
			reversals: 0,
			intrusions: 1,
			aesthetic: 10,
		};
		const clear = { crossings: 0, reversals: 0, intrusions: 0, aesthetic: 20 };
		expect(compareCost(clear, grazing)).toBeLessThan(0);
	});

	it("compares by aesthetics when crossings, reversals and intrusions are equal", () => {
		expect(
			compareCost(
				{ crossings: 0, reversals: 0, intrusions: 0, aesthetic: 10 },
				{ crossings: 0, reversals: 0, intrusions: 0, aesthetic: 20 },
			),
		).toBeLessThan(0);
	});
});

describe("calcRouteCost", () => {
	it("a reversal spike is counted in the reversals tier (ranked above aesthetics)", () => {
		// even for the same single corner, a reversal spike is flagged so it loses to any spike-free route
		const spike = [
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
			{ x: 10, y: 0 },
		];
		const clean = [
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
			{ x: 20, y: 20 },
		];
		const noObstacles = {
			source: null,
			target: null,
			sourceClearance: null,
			targetClearance: null,
		};
		const spikeCost = calcRouteCost(spike, spike, noObstacles);
		const cleanCost = calcRouteCost(clean, clean, noObstacles);
		expect(spikeCost.crossings).toBe(0);
		expect(cleanCost.crossings).toBe(0);
		expect(spikeCost.reversals).toBe(1);
		expect(cleanCost.reversals).toBe(0);
	});

	it("crossings reflects the crossing count of simplifiedElbow", () => {
		const elbow = [
			{ x: 0, y: 100 },
			{ x: 200, y: 100 },
		];
		const cost = calcRouteCost(elbow, elbow, {
			source: box,
			target: null,
			sourceClearance: null,
			targetClearance: null,
		});
		expect(cost.crossings).toBe(1);
	});
});
