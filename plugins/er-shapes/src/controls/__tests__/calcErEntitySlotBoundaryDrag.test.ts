import { describe, expect, it } from "vitest";

import { calcErEntitySlotBoundaryDrag } from "../calcErEntitySlotBoundaryDrag";
import {
	ER_ENTITY_KEY_NAME_BOUNDARY,
	ER_ENTITY_NAME_TYPE_BOUNDARY,
	parseErEntitySlotBoundaryIndex,
} from "../erEntitySlotBoundaryAction";

/** The floors the texts of the entities below set: key 28, name 40, type 60. */
const FLOORS = { keyWidth: 28, nameWidth: 40, typeWidth: 60 };

/** 220 wide: key 30, name 100, type 90. */
const START = { keyWidth: 30, nameWidth: 100, typeWidth: 90, floors: FLOORS };

describe("calcErEntitySlotBoundaryDrag: key / name", () => {
	it("widens the key by the drag, the name and type unchanged", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				20,
				"leading",
			),
		).toEqual({ keyWidth: 50, nameWidth: 100, typeWidth: 90 });
	});

	it("stops the key at its floor, and the box at its static minimum", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				-50,
				"leading",
			),
		).toEqual({ keyWidth: 28, nameWidth: 100, typeWidth: 90 });
		// 130 wide: shrinking the key by more than 10 would take the box under 120.
		expect(
			calcErEntitySlotBoundaryDrag(
				{
					keyWidth: 40,
					nameWidth: 30,
					typeWidth: 60,
					floors: { ...FLOORS, keyWidth: 24, nameWidth: 24 },
				},
				ER_ENTITY_KEY_NAME_BOUNDARY,
				-15,
				"leading",
			),
		).toEqual({ keyWidth: 30, nameWidth: 30, typeWidth: 60 });
	});

	it("trades between the key and the name, their sum kept", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				20,
				"pair",
			),
		).toEqual({ keyWidth: 50, nameWidth: 80, typeWidth: 90 });
	});

	it("stops a trade where either the key or the name reaches its floor", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				500,
				"pair",
			),
		).toEqual({ keyWidth: 90, nameWidth: 40, typeWidth: 90 });
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				-500,
				"pair",
			),
		).toEqual({ keyWidth: 28, nameWidth: 102, typeWidth: 90 });
	});
});

describe("calcErEntitySlotBoundaryDrag: name / type", () => {
	it("widens the name by the drag, the key and type unchanged", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				40,
				"leading",
			),
		).toEqual({ keyWidth: 30, nameWidth: 140, typeWidth: 90 });
	});

	it("stops the name at its floor, or the box at its static minimum", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				-500,
				"leading",
			),
		).toEqual({ keyWidth: 30, nameWidth: 40, typeWidth: 90 });
		expect(
			calcErEntitySlotBoundaryDrag(
				{
					keyWidth: 24,
					nameWidth: 116,
					typeWidth: 60,
					floors: { ...FLOORS, nameWidth: 24 },
				},
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				-500,
				"leading",
			),
		).toEqual({ keyWidth: 24, nameWidth: 36, typeWidth: 60 });
	});

	it("trades between the name and the type, their sum kept", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				20,
				"pair",
			),
		).toEqual({ keyWidth: 30, nameWidth: 120, typeWidth: 70 });
	});

	it("stops a trade where either the name or the type reaches its floor", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				500,
				"pair",
			),
		).toEqual({ keyWidth: 30, nameWidth: 130, typeWidth: 60 });
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				-500,
				"pair",
			),
		).toEqual({ keyWidth: 30, nameWidth: 40, typeWidth: 150 });
	});
});

describe("calcErEntitySlotBoundaryDrag: rounding and the degenerate case", () => {
	it("rounds a moved slot to the size precision", () => {
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				1 / 3,
				"leading",
			),
		).toEqual({ keyWidth: 30.3333, nameWidth: 100, typeWidth: 90 });
		expect(
			calcErEntitySlotBoundaryDrag(
				START,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				1 / 3,
				"pair",
			),
		).toEqual({ keyWidth: 30, nameWidth: 100.3333, typeWidth: 89.6667 });
	});

	it("gives up a trade the slots are too narrow for", () => {
		const narrow = {
			keyWidth: 25,
			nameWidth: 35,
			typeWidth: 60,
			floors: { ...FLOORS, typeWidth: 70 },
		};
		expect(
			calcErEntitySlotBoundaryDrag(
				narrow,
				ER_ENTITY_KEY_NAME_BOUNDARY,
				10,
				"pair",
			),
		).toBeNull();
		expect(
			calcErEntitySlotBoundaryDrag(
				narrow,
				ER_ENTITY_NAME_TYPE_BOUNDARY,
				10,
				"pair",
			),
		).toBeNull();
	});
});

describe("parseErEntitySlotBoundaryIndex", () => {
	it("reads the two boundaries and nothing else", () => {
		expect(parseErEntitySlotBoundaryIndex("0")).toBe(
			ER_ENTITY_KEY_NAME_BOUNDARY,
		);
		expect(parseErEntitySlotBoundaryIndex("1")).toBe(
			ER_ENTITY_NAME_TYPE_BOUNDARY,
		);
		expect(parseErEntitySlotBoundaryIndex("2")).toBeNull();
		expect(parseErEntitySlotBoundaryIndex(" 1")).toBeNull();
		expect(parseErEntitySlotBoundaryIndex(undefined)).toBeNull();
	});
});
