import { describe, it, expect } from "vitest";

import { calcDrawBounds, DEFAULT_MIN_DRAW_SIZE } from "../calcDrawBounds";

describe("calcDrawBounds", () => {
	it("normalizes a rightward-downward drag", () => {
		expect(calcDrawBounds(10, 20, 110, 70)).toEqual({
			left: 10,
			top: 20,
			width: 100,
			height: 50,
		});
	});

	it("normalizes a leftward-upward drag to the same bounds", () => {
		expect(calcDrawBounds(110, 70, 10, 20)).toEqual({
			left: 10,
			top: 20,
			width: 100,
			height: 50,
		});
	});

	it("returns null when either edge is below the default minimum", () => {
		expect(calcDrawBounds(0, 0, 4, 100)).toBeNull();
		expect(calcDrawBounds(0, 0, 100, 4)).toBeNull();
	});

	it("accepts an edge exactly at the minimum (strict < check)", () => {
		expect(
			calcDrawBounds(0, 0, DEFAULT_MIN_DRAW_SIZE, DEFAULT_MIN_DRAW_SIZE),
		).toEqual({
			left: 0,
			top: 0,
			width: DEFAULT_MIN_DRAW_SIZE,
			height: DEFAULT_MIN_DRAW_SIZE,
		});
	});

	it("honors an explicit minSize", () => {
		expect(calcDrawBounds(0, 0, 15, 15, 20)).toBeNull();
		expect(calcDrawBounds(0, 0, 15, 15, 10)).not.toBeNull();
	});

	it("minSize 0 accepts a degenerate drag (programmatic creation)", () => {
		expect(calcDrawBounds(30, 40, 30, 40, 0)).toEqual({
			left: 30,
			top: 40,
			width: 0,
			height: 0,
		});
	});
});
