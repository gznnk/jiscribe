import { describe, expect, it } from "vitest";

import {
	calcPinInsertionIndex,
	movePinnedCategory,
	resolvePinInsertionMark,
} from "../pinnedCategoryOrder";

const PINS = ["a", "b", "c", "d"];

describe("calcPinInsertionIndex", () => {
	it("lands before the hovered pin when dragged up, after it when dragged down", () => {
		expect(calcPinInsertionIndex(PINS, "c", "a")).toBe(0);
		expect(calcPinInsertionIndex(PINS, "a", "c")).toBe(3);
		expect(calcPinInsertionIndex(PINS, "a", "d")).toBe(4);
	});

	it("is null over the dragged pin itself, or over a category that is not pinned", () => {
		expect(calcPinInsertionIndex(PINS, "b", "b")).toBeNull();
		expect(calcPinInsertionIndex(PINS, "b", "unpinned")).toBeNull();
	});
});

describe("movePinnedCategory", () => {
	it("moves a pin up and down the order", () => {
		expect(movePinnedCategory(PINS, "c", 0)).toEqual(["c", "a", "b", "d"]);
		expect(movePinnedCategory(PINS, "a", 3)).toEqual(["b", "c", "a", "d"]);
		expect(movePinnedCategory(PINS, "a", 4)).toEqual(["b", "c", "d", "a"]);
	});

	it("hands the order back as is for a move that changes nothing", () => {
		expect(movePinnedCategory(PINS, "b", 1)).toBe(PINS);
		expect(movePinnedCategory(PINS, "b", 2)).toBe(PINS);
		expect(movePinnedCategory(PINS, "unpinned", 0)).toBe(PINS);
	});

	it("lands where calcPinInsertionIndex says, onto the hovered pin's place", () => {
		const insertionIndex = calcPinInsertionIndex(PINS, "a", "c");
		expect(movePinnedCategory(PINS, "a", insertionIndex!).indexOf("a")).toBe(
			PINS.indexOf("c"),
		);
	});
});

describe("resolvePinInsertionMark", () => {
	it("marks the gap before the first drawn pin at or after the index", () => {
		expect(resolvePinInsertionMark(PINS, PINS, 0)).toEqual({
			categoryId: "a",
			edge: "before",
		});
		// `b` is a pin the library does not hold: nothing drawn to mark beside.
		expect(resolvePinInsertionMark(PINS, ["a", "c", "d"], 1)).toEqual({
			categoryId: "c",
			edge: "before",
		});
	});

	it("marks the gap after the last drawn pin for an index past every drawn pin", () => {
		expect(resolvePinInsertionMark(PINS, PINS, 4)).toEqual({
			categoryId: "d",
			edge: "after",
		});
		expect(resolvePinInsertionMark(PINS, ["a", "b"], 3)).toEqual({
			categoryId: "b",
			edge: "after",
		});
	});

	it("marks nothing without an index or a drawn pin", () => {
		expect(resolvePinInsertionMark(PINS, PINS, null)).toBeNull();
		expect(resolvePinInsertionMark(PINS, [], 0)).toBeNull();
	});
});
