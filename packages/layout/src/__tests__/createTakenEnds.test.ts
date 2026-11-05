import { describe, expect, it } from "vitest";

import { EDGE_END_SPACING } from "../chooseEdgeAnchors";
import { createTakenEnds } from "../createTakenEnds";

// A width the spacing divides into an exact binary fraction, so the steps land exactly.
const box = { x: 0, y: 0, width: 160, height: 100 };

describe("createTakenEnds", () => {
	it("hands out the midpoint of a free side", () => {
		expect(createTakenEnds([]).place("a", "top", box)).toEqual({
			side: "top",
			t: 0.5,
		});
	});

	it("steps clear of an end already there, before then after the midpoint", () => {
		const gap = EDGE_END_SPACING / box.width;
		const takenEnds = createTakenEnds([{ ownerId: "a", side: "top", t: 0.5 }]);
		expect(takenEnds.place("a", "top", box).t).toBe(0.5 - gap);
		expect(takenEnds.place("a", "top", box).t).toBe(0.5 + gap);
		// Another side and another owner are free.
		expect(takenEnds.place("a", "left", box).t).toBe(0.5);
		expect(takenEnds.place("b", "top", box).t).toBe(0.5);
	});

	it("falls back to the midpoint when the side is full", () => {
		const narrow = { x: 0, y: 0, width: EDGE_END_SPACING, height: 10 };
		const takenEnds = createTakenEnds([{ ownerId: "a", side: "top", t: 0.5 }]);
		expect(takenEnds.place("a", "top", narrow).t).toBe(0.5);
	});
});
