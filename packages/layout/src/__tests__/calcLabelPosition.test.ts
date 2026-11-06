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

	it("passes over a spot whose box would touch one of the boxes the edge joins", () => {
		// The run at y = 50 holds the 40px label, but a box sits right under it; the
		// label moves to the first vertical segment instead.
		const placement = calcLabelPosition(
			path,
			{ x: 50, y: 50 },
			size,
			"TB",
			80,
			[{ x: 30, y: 58, width: 40, height: 40 }],
		);
		expect(placement).toEqual({ position: 0.125, offset: 0 });
	});

	it("puts no label on the stretch an end runs through its own node's visual margin", () => {
		const straight = [
			{ x: 0, y: 0 },
			{ x: 0, y: 200 },
		];
		expect(
			calcLabelPosition(straight, { x: 0, y: 100 }, size, "TB", 80),
		).toEqual({ position: 0.5, offset: 0 });
		// The first 100px run through the source's margin: the middle of the rest.
		expect(
			calcLabelPosition(straight, { x: 0, y: 100 }, size, "TB", 80, [], {
				start: 100,
				end: 0,
			}),
		).toEqual({ position: 0.75, offset: 0 });
		// What is left past both margins is too short to hold it: beside the middle of
		// the rest, not of the whole.
		expect(
			calcLabelPosition(straight, { x: 0, y: 100 }, size, "TB", 80, [], {
				start: 150,
				end: 30,
			}),
		).toEqual({ position: 0.8, offset: 26 });
		// Margins that take the whole route leave it to the whole route.
		expect(
			calcLabelPosition(straight, { x: 0, y: 100 }, size, "TB", 80, [], {
				start: 120,
				end: 80,
			}),
		).toEqual({ position: 0.5, offset: 0 });
	});

	it("ignores a run in another gap", () => {
		// The label belongs to a gap at y = 200: no run there, so the longest holding
		// segment (the run, 100 long) takes it.
		expect(
			calcLabelPosition(path, { x: 0, y: 200 }, size, "TB", 80).position,
		).toBe(0.5);
	});
});
