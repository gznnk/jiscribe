import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { moveConnectorSegment } from "../moveConnectorSegment";

// The two-corner route the engine draws between a right face at (160, 90) and a left face at
// (420, 270). Its corners become the connector's vertices the first time a segment is dragged.
const autoPath: Point[] = [
	{ x: 160, y: 90 },
	{ x: 290, y: 90 },
	{ x: 290, y: 270 },
	{ x: 420, y: 270 },
];

/** Verifies that each segment of `[source, ...vertices, target]` is horizontal or vertical. */
const expectOrthogonal = (
	vertices: Point[],
	source: Point,
	target: Point,
): void => {
	const path = [source, ...vertices, target];
	for (let i = 1; i < path.length; i++) {
		const horizontal = path[i].y === path[i - 1].y;
		const vertical = path[i].x === path[i - 1].x;
		expect(
			horizontal || vertical,
			`segment ${i - 1}→${i} is diagonal: ${JSON.stringify(path)}`,
		).toBe(true);
	}
};

describe("moveConnectorSegment", () => {
	it("takes both vertices of a middle segment along, freezing the engine's corners", () => {
		const vertices = moveConnectorSegment(autoPath, 1, "x", 350);

		expect(vertices).toEqual([
			{ x: 350, y: 90 },
			{ x: 350, y: 270 },
		]);
		expectOrthogonal(vertices, autoPath[0], autoPath[3]);
	});

	it("keeps the dragged end segment whole and joins the endpoint with a perpendicular", () => {
		const vertices = moveConnectorSegment(autoPath, 0, "y", 140);

		// The segment keeps its full extent at the new y; the source joins it straight down.
		expect(vertices).toEqual([
			{ x: 160, y: 140 },
			{ x: 290, y: 140 },
			{ x: 290, y: 270 },
		]);
		expectOrthogonal(vertices, autoPath[0], autoPath[3]);
	});

	it("joins with a perpendicular on the target side when the last segment is dragged", () => {
		const vertices = moveConnectorSegment(autoPath, 2, "y", 320);

		expect(vertices).toEqual([
			{ x: 290, y: 90 },
			{ x: 290, y: 320 },
			{ x: 420, y: 320 },
		]);
		expectOrthogonal(vertices, autoPath[0], autoPath[3]);
	});

	it("adds a perpendicular on each side when the whole connector is one segment", () => {
		const straightPath: Point[] = [
			{ x: 160, y: 90 },
			{ x: 420, y: 90 },
		];

		const vertices = moveConnectorSegment(straightPath, 0, "y", 160);

		expect(vertices).toEqual([
			{ x: 160, y: 160 },
			{ x: 420, y: 160 },
		]);
		expectOrthogonal(vertices, straightPath[0], straightPath[1]);
	});

	it("pins the corners as they are when the drag ends where it started", () => {
		const vertices = moveConnectorSegment(autoPath, 0, "y", 90);

		// The degenerate perpendicular (source to itself) is dropped, not stored.
		expect(vertices).toEqual([
			{ x: 290, y: 90 },
			{ x: 290, y: 270 },
		]);
		expectOrthogonal(vertices, autoPath[0], autoPath[3]);
	});

	it("leaves a single corner when a run is dropped onto the far endpoint's face line", () => {
		const vertices = moveConnectorSegment(autoPath, 1, "x", 420);

		// The lower vertex lands on the target and is dropped; the upper one is the whole corner.
		expect(vertices).toEqual([{ x: 420, y: 90 }]);
		expectOrthogonal(vertices, autoPath[0], autoPath[3]);
	});

	it("drops a detour entirely when it is dragged back onto the endpoints' line", () => {
		const detourPath: Point[] = [
			{ x: 160, y: 90 },
			{ x: 160, y: 150 },
			{ x: 420, y: 150 },
			{ x: 420, y: 90 },
		];

		const vertices = moveConnectorSegment(detourPath, 1, "y", 90);

		// Both moved vertices land on the endpoints: nothing is left to store.
		expect(vertices).toEqual([]);
	});

	it("moves a whole run when a neighbouring segment lies on the dragged line (no diagonal)", () => {
		// A→B and B→C are one horizontal line on screen (a colinear B survives in drawn paths via
		// shape moves or an AI-written doc — drags themselves no longer store one).
		// Dragging B→C alone would leave A behind and hang A→B diagonally off the corner.
		// B, passed straight through, is dropped from the result.
		const foldedPath: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 50 },
			{ x: 60, y: 50 },
			{ x: 120, y: 50 },
			{ x: 120, y: 110 },
		];

		const vertices = moveConnectorSegment(foldedPath, 2, "y", 90);

		expect(vertices).toEqual([
			{ x: 0, y: 90 },
			{ x: 120, y: 90 },
		]);
		expectOrthogonal(vertices, foldedPath[0], foldedPath[4]);
	});

	it("merges a run dropped exactly onto a parallel one, leaving no corners behind", () => {
		const uPath: Point[] = [
			{ x: 0, y: 0 },
			{ x: 60, y: 0 },
			{ x: 60, y: 80 },
			{ x: 140, y: 80 },
			{ x: 140, y: 0 },
			{ x: 200, y: 0 },
		];

		const vertices = moveConnectorSegment(uPath, 2, "y", 0);

		// The whole path has become the endpoints' own line: back to the engine's route.
		expect(vertices).toEqual([]);
	});

	it("moves a merged one-line path whole, keeping only its two end corners", () => {
		const mergedPath: Point[] = [
			{ x: 0, y: 0 },
			{ x: 60, y: 0 },
			{ x: 140, y: 0 },
			{ x: 200, y: 0 },
		];

		const vertices = moveConnectorSegment(mergedPath, 1, "y", 70);

		// The interior fold remnants are passed straight through at the new y and dropped.
		expect(vertices).toEqual([
			{ x: 0, y: 70 },
			{ x: 200, y: 70 },
		]);
		expectOrthogonal(vertices, mergedPath[0], mergedPath[3]);
	});

	it("drops the turnaround too when a run folds onto an adjacent segment's line", () => {
		const overshootPath: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 },
			{ x: 40, y: 50 },
			{ x: 40, y: 120 },
		];

		const vertices = moveConnectorSegment(overshootPath, 2, "y", 0);

		// Keeping the turnaround at x=100 would freeze an overshoot stub with no perpendicular
		// segment to grab; the fold dissolves into a plain corner instead.
		expect(vertices).toEqual([{ x: 40, y: 0 }]);
		expectOrthogonal(vertices, overshootPath[0], overshootPath[4]);
	});

	it("repeats the cleanup until removed folds leave no colinear survivors behind", () => {
		// Dragging the left run onto the right one folds the detour flat: the fold vertices go
		// first, which only then exposes that (300,0) sits straight on the source's line too.
		const detourPath: Point[] = [
			{ x: 0, y: 0 },
			{ x: -200, y: 0 },
			{ x: -200, y: 320 },
			{ x: 300, y: 320 },
			{ x: 300, y: 0 },
			{ x: 390, y: 0 },
			{ x: 390, y: 150 },
		];

		const vertices = moveConnectorSegment(detourPath, 1, "x", 300);

		expect(vertices).toEqual([{ x: 390, y: 0 }]);
		expectOrthogonal(vertices, detourPath[0], detourPath[6]);
	});

	it("keeps the vertices on either side of a middle segment untouched", () => {
		const longPath: Point[] = [
			{ x: 160, y: 90 },
			{ x: 220, y: 90 },
			{ x: 220, y: 180 },
			{ x: 340, y: 180 },
			{ x: 340, y: 270 },
			{ x: 420, y: 270 },
		];

		const vertices = moveConnectorSegment(longPath, 2, "y", 210);

		expect(vertices).toEqual([
			{ x: 220, y: 90 },
			{ x: 220, y: 210 },
			{ x: 340, y: 210 },
			{ x: 340, y: 270 },
		]);
		expectOrthogonal(vertices, longPath[0], longPath[5]);
	});
});
