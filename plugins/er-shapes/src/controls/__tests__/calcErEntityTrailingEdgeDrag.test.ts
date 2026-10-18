import { describe, expect, it } from "vitest";

import { calcErEntityTrailingEdgeDrag } from "../calcErEntityTrailingEdgeDrag";

/** The floors the texts of the entities below set: key 24, name 40, type 60. */
const FLOORS = { keyWidth: 24, nameWidth: 40, typeWidth: 60 };

/** 220 wide: key 30, name 100, type 90. */
const START = { keyWidth: 30, nameWidth: 100, typeWidth: 90, floors: FLOORS };

describe("calcErEntityTrailingEdgeDrag", () => {
	it("widens the type by the drag, the key and the name unchanged", () => {
		expect(calcErEntityTrailingEdgeDrag(START, 40)).toEqual({
			keyWidth: 30,
			nameWidth: 100,
			typeWidth: 130,
		});
	});

	it("narrows the type alone", () => {
		expect(calcErEntityTrailingEdgeDrag(START, -20)).toEqual({
			keyWidth: 30,
			nameWidth: 100,
			typeWidth: 70,
		});
	});

	it("stops the type at its floor", () => {
		expect(calcErEntityTrailingEdgeDrag(START, -500)).toEqual({
			keyWidth: 30,
			nameWidth: 100,
			typeWidth: 60,
		});
	});

	it("stops the box at its static minimum before the type reaches its floor", () => {
		// 130 wide: shrinking the type by more than 10 would take the box under 120.
		expect(
			calcErEntityTrailingEdgeDrag(
				{ keyWidth: 24, nameWidth: 26, typeWidth: 80, floors: FLOORS },
				-30,
			),
		).toEqual({ keyWidth: 24, nameWidth: 26, typeWidth: 70 });
	});

	it("rounds the type to the size precision", () => {
		expect(calcErEntityTrailingEdgeDrag(START, 1 / 3)).toEqual({
			keyWidth: 30,
			nameWidth: 100,
			typeWidth: 90.3333,
		});
	});
});
