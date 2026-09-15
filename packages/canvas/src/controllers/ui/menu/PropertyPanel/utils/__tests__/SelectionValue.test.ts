import { describe, it, expect } from "vitest";

import {
	combineSelectionValues,
	isMixedSelectionValue,
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

	it("one entry out of many differing → mixed, carrying the first entry", () => {
		expect(combineSelectionValues([2, 2, 3])).toEqual({
			kind: "mixed",
			first: 2,
		});
	});

	it("undefined is a value like any other, not an absence", () => {
		expect(combineSelectionValues([undefined, undefined])).toEqual({
			kind: "single",
			value: undefined,
		});
		expect(combineSelectionValues([undefined, "bold"])).toEqual({
			kind: "mixed",
			first: undefined,
		});
	});
});

describe("selectionValueOr", () => {
	it("gives the agreed value back", () => {
		expect(selectionValueOr({ kind: "single", value: 8 }, 0)).toBe(8);
	});

	it("falls back for both of the cases with no single value", () => {
		expect(selectionValueOr({ kind: "mixed", first: 8 }, 0)).toBe(0);
		expect(selectionValueOr({ kind: "none" }, 0)).toBe(0);
	});
});

describe("selectionValueOrFirst", () => {
	it("gives the agreed value back", () => {
		expect(selectionValueOrFirst({ kind: "single", value: 8 }, 0)).toBe(8);
	});

	it("gives one of the differing values back, so a step moves from a real one", () => {
		expect(selectionValueOrFirst({ kind: "mixed", first: 8 }, 0)).toBe(8);
	});

	it("falls back only where the selection carries no value at all", () => {
		expect(selectionValueOrFirst({ kind: "none" }, 0)).toBe(0);
	});
});

describe("isMixedSelectionValue", () => {
	it("only mixed is mixed; none is a row showing its own default", () => {
		expect(isMixedSelectionValue({ kind: "mixed", first: 1 })).toBe(true);
		expect(isMixedSelectionValue({ kind: "none" })).toBe(false);
		expect(isMixedSelectionValue({ kind: "single", value: 1 })).toBe(false);
	});
});
