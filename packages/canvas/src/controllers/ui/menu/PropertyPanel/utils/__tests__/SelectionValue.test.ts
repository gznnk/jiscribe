import { describe, it, expect } from "vitest";

import {
	combineSelectionValues,
	isMixedSelectionValue,
	selectionValueOr,
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

	it("one entry out of many differing → mixed", () => {
		expect(combineSelectionValues([2, 2, 3])).toEqual({ kind: "mixed" });
	});

	it("undefined is a value like any other, not an absence", () => {
		expect(combineSelectionValues([undefined, undefined])).toEqual({
			kind: "single",
			value: undefined,
		});
		expect(combineSelectionValues([undefined, "bold"])).toEqual({
			kind: "mixed",
		});
	});
});

describe("selectionValueOr", () => {
	it("gives the agreed value back", () => {
		expect(selectionValueOr({ kind: "single", value: 8 }, 0)).toBe(8);
	});

	it("falls back for both of the cases with no single value", () => {
		expect(selectionValueOr({ kind: "mixed" }, 0)).toBe(0);
		expect(selectionValueOr({ kind: "none" }, 0)).toBe(0);
	});
});

describe("isMixedSelectionValue", () => {
	it("only mixed is mixed; none is a row showing its own default", () => {
		expect(isMixedSelectionValue({ kind: "mixed" })).toBe(true);
		expect(isMixedSelectionValue({ kind: "none" })).toBe(false);
		expect(isMixedSelectionValue({ kind: "single", value: 1 })).toBe(false);
	});
});
