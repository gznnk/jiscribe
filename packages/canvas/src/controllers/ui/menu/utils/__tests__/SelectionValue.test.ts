import { describe, it, expect } from "vitest";

import {
	combineSelectionValues,
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
	selectionValueOrFirst,
} from "../SelectionValue";

describe("combineSelectionValues", () => {
	it("nothing has the property → none", () => {
		expect(combineSelectionValues([])).toEqual({ kind: "none" });
	});

	it("one entry → that value", () => {
		expect(combineSelectionValues(["#f00"])).toEqual({
			kind: "single",
			value: "#f00",
		});
	});

	it("entries that agree → one value", () => {
		expect(combineSelectionValues([2, 2, 2])).toEqual({
			kind: "single",
			value: 2,
		});
	});

	it("one entry out of many differing → mixed, carrying each value once", () => {
		expect(combineSelectionValues([2, 2, 3])).toEqual({
			kind: "mixed",
			values: [2, 3],
		});
	});

	it("keeps the values in the order they first appear in the selection", () => {
		expect(combineSelectionValues(["#0f0", "#f00", "#0f0", "#00f"])).toEqual({
			kind: "mixed",
			values: ["#0f0", "#f00", "#00f"],
		});
	});

	it("compares with Object.is, so NaN is one value and -0 another than 0", () => {
		expect(combineSelectionValues([Number.NaN, Number.NaN])).toEqual({
			kind: "single",
			value: Number.NaN,
		});
		expect(combineSelectionValues([0, -0])).toEqual({
			kind: "mixed",
			values: [0, -0],
		});
	});

	it("undefined is a value like any other, not an absence", () => {
		expect(combineSelectionValues([undefined, undefined])).toEqual({
			kind: "single",
			value: undefined,
		});
		expect(combineSelectionValues([undefined, "bold"])).toEqual({
			kind: "mixed",
			values: [undefined, "bold"],
		});
	});
});

describe("selectionValueOr", () => {
	it("gives the agreed value back", () => {
		expect(selectionValueOr({ kind: "single", value: 8 }, 0)).toBe(8);
	});

	it("falls back for both of the cases with no single value", () => {
		expect(selectionValueOr({ kind: "mixed", values: [8, 3] }, 0)).toBe(0);
		expect(selectionValueOr({ kind: "none" }, 0)).toBe(0);
	});
});

describe("selectionValueOrFirst", () => {
	it("gives the agreed value back", () => {
		expect(selectionValueOrFirst({ kind: "single", value: 8 }, 0)).toBe(8);
	});

	it("gives one of the differing values back, so a step moves from a real one", () => {
		expect(selectionValueOrFirst({ kind: "mixed", values: [8, 3] }, 0)).toBe(8);
	});

	it("falls back only where the selection carries no value at all", () => {
		expect(selectionValueOrFirst({ kind: "none" }, 0)).toBe(0);
	});
});

describe("isMixedSelectionValue", () => {
	it("only mixed is mixed; none is a row showing its own default", () => {
		expect(isMixedSelectionValue({ kind: "mixed", values: [1, 2] })).toBe(true);
		expect(isMixedSelectionValue({ kind: "none" })).toBe(false);
		expect(isMixedSelectionValue({ kind: "single", value: 1 })).toBe(false);
	});
});

describe("selectionMixedValues", () => {
	it("gives the differing values of a mixed selection back", () => {
		expect(selectionMixedValues({ kind: "mixed", values: [1, 2] })).toEqual([
			1, 2,
		]);
	});

	it("is undefined where the selection is not mixed", () => {
		expect(selectionMixedValues({ kind: "single", value: 1 })).toBeUndefined();
		expect(selectionMixedValues({ kind: "none" })).toBeUndefined();
	});
});
