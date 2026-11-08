import { describe, expect, it } from "vitest";

import { EDGE_END_SPACING } from "../../shared/edgeSpacing";
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

	it("hands out the middle of the usable stretch when it leaves out the side's middle, and searches only within it", () => {
		const gap = EDGE_END_SPACING / box.width;
		const usable = { min: 0.5625, max: 1 };
		const takenEnds = createTakenEnds([]);
		expect(takenEnds.place("a", "top", box, usable).t).toBe(0.78125);
		expect(takenEnds.place("a", "top", box, usable).t).toBe(0.78125 - gap);
		// 0.78125 + 1 gap is past 0.9 (a tenth of the side kept clear) and - 2 gaps
		// below the usable stretch, so the side is full and the start is handed out.
		expect(takenEnds.place("a", "top", box, usable).t).toBe(0.78125);
	});

	it("starts from the side's middle when a lopsided usable stretch holds it", () => {
		const gap = EDGE_END_SPACING / box.width;
		const usable = { min: 0, max: 0.875 };
		const takenEnds = createTakenEnds([]);
		const handedOut = Array.from(
			{ length: 8 },
			() => takenEnds.place("a", "top", box, usable).t,
		);
		expect(handedOut).toEqual([
			0.5,
			0.5 - gap,
			0.5 + gap,
			0.5 - 2 * gap,
			0.5 + 2 * gap,
			0.5 - 3 * gap,
			0.5 + 3 * gap,
			// 0.5 ± 4 gaps is 0 / 1, past the tenth kept clear and the usable stretch.
			0.5,
		]);
	});

	it("goes on searching below the start once the usable stretch runs out above it", () => {
		const gap = EDGE_END_SPACING / box.width;
		const usable = { min: 0, max: 0.625 };
		const takenEnds = createTakenEnds([{ ownerId: "a", side: "top", t: 0.5 }]);
		const handedOut = Array.from(
			{ length: 4 },
			() => takenEnds.place("a", "top", box, usable).t,
		);
		expect(handedOut).toEqual([
			0.5 - gap,
			0.5 + gap,
			0.5 - 2 * gap,
			0.5 - 3 * gap,
		]);
		for (const t of handedOut) {
			expect(t).toBeGreaterThanOrEqual(usable.min);
			expect(t).toBeLessThanOrEqual(usable.max);
		}
	});

	it("never hands out a position below the usable stretch", () => {
		const gap = EDGE_END_SPACING / box.width;
		// Holds the side's middle, but not a gap below it.
		const usable = { min: 0.4375, max: 1 };
		const takenEnds = createTakenEnds([{ ownerId: "a", side: "top", t: 0.5 }]);
		expect(takenEnds.place("a", "top", box, usable).t).toBe(0.5 + gap);
	});

	it("starts within the tenth kept clear at either end when the usable stretch's middle lies past it", () => {
		// The search runs over 0.85..0.9 (0.1..0.9 cut down to the usable stretch), so
		// the usable stretch's middle, 0.925, is brought back to 0.9.
		const usable = { min: 0.85, max: 1 };
		expect(createTakenEnds([]).place("a", "top", box, usable).t).toBe(0.9);
	});

	it("starts from the middle of the side's body", () => {
		const gap = EDGE_END_SPACING / box.width;
		const body = { min: 0.25, max: 1 };
		const takenEnds = createTakenEnds([]);
		expect(takenEnds.place("a", "top", box, undefined, body).t).toBe(0.625);
		expect(takenEnds.place("a", "top", box, undefined, body).t).toBe(
			0.625 - gap,
		);
	});
});
