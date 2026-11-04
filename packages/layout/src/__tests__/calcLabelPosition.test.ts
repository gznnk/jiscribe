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
	const size = { width: 40, height: 20 };

	it("puts the label on the run through its gap, level with dagre's spot", () => {
		expect(calcLabelPosition(path, { x: 50, y: 50 }, size, "TB", 80)).toEqual({
			position: 0.5,
			offset: 0,
		});
		expect(
			calcLabelPosition(path, { x: 70, y: 50 }, size, "TB", 80).position,
		).toBe(0.6);
	});

	it("keeps the label's box clear of the run's corners", () => {
		// Dagre's spot lies past the run's end; the label stops 20 + 8 short of the corner.
		expect(
			calcLabelPosition(path, { x: 300, y: 50 }, size, "TB", 80).position,
		).toBe(0.61);
	});

	it("moves to the longest segment that holds it when the run is too short", () => {
		// A label wider than the 100px run goes to a vertical segment: both are 50 long
		// and hold a 20px-high label, so the first one, at its midpoint.
		const wide = { width: 120, height: 20 };
		expect(calcLabelPosition(path, { x: 50, y: 50 }, wide, "TB", 80)).toEqual({
			position: 0.125,
			offset: 0,
		});
	});

	it("sets the label beside the longest segment when none can hold it", () => {
		const huge = { width: 120, height: 60 };
		expect(calcLabelPosition(path, { x: 50, y: 50 }, huge, "TB", 80)).toEqual({
			position: 0.5,
			offset: 36,
		});
	});

	it("ignores a run in another gap", () => {
		// The label belongs to a gap at y = 200: no run there, so the longest holding
		// segment (the run, 100 long) takes it.
		expect(
			calcLabelPosition(path, { x: 0, y: 200 }, size, "TB", 80).position,
		).toBe(0.5);
	});
});
