import { describe, expect, it } from "vitest";

import { calcLabelPosition } from "../calcLabelPosition";

describe("calcLabelPosition", () => {
	// Down 50, right 100, down 50: the sideways run sits in the gap at y = 50.
	const path = [
		{ x: 0, y: 0 },
		{ x: 0, y: 50 },
		{ x: 100, y: 50 },
		{ x: 100, y: 100 },
	];

	it("puts the label on the run through its gap, level with dagre's spot", () => {
		expect(calcLabelPosition(path, { x: 50, y: 50 }, 40, "TB", 80)).toBe(0.5);
		expect(calcLabelPosition(path, { x: 70, y: 50 }, 40, "TB", 80)).toBe(0.6);
	});

	it("keeps the label half its extent clear of the run's corners", () => {
		// Dagre's spot lies past the run's end; the label stops 20px short of the corner.
		expect(calcLabelPosition(path, { x: 300, y: 50 }, 40, "TB", 80)).toBe(0.65);
	});

	it("falls back to the nearest spot on the route when the run is too short", () => {
		// A label wider than the run: the nearest spot to dagre's point is the first corner.
		expect(calcLabelPosition(path, { x: 20, y: 50 }, 120, "TB", 80)).toBe(0.35);
	});

	it("ignores a run in another gap", () => {
		expect(calcLabelPosition(path, { x: 0, y: 200 }, 40, "TB", 80)).toBe(1);
	});
});
