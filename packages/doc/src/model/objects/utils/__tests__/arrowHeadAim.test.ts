import { describe, expect, it } from "vitest";

import { calcArrowHeadRadians, resolveArrowHeadPath } from "../arrowHeadAim";

describe("resolveArrowHeadPath", () => {
	it("drops a point lying within 0.5px of an end, leaving the end a segment to aim along", () => {
		expect(
			resolveArrowHeadPath([
				{ x: 0, y: 0 },
				{ x: 0.4, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 50 },
				{ x: 100, y: 50 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 },
		]);
	});

	it("keeps a point just over 0.5px from the one before", () => {
		expect(
			resolveArrowHeadPath([
				{ x: 0, y: 0 },
				{ x: 0.6, y: 0 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 0.6, y: 0 },
		]);
	});

	it("answers null when fewer than two points remain", () => {
		expect(resolveArrowHeadPath([])).toBeNull();
		expect(resolveArrowHeadPath([{ x: 10, y: 10 }])).toBeNull();
		expect(
			resolveArrowHeadPath([
				{ x: 10, y: 10 },
				{ x: 10.3, y: 10 },
				{ x: 10.3, y: 10.3 },
			]),
		).toBeNull();
	});
});

describe("calcArrowHeadRadians", () => {
	it("points each head out of a horizontal line through its end", () => {
		const { startRadians, endRadians } = calcArrowHeadRadians([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		expect(startRadians).toBe(Math.PI);
		expect(endRadians).toBe(0);
	});

	it("points each head out of a vertical line through its end, +y being down", () => {
		const { startRadians, endRadians } = calcArrowHeadRadians([
			{ x: 0, y: 0 },
			{ x: 0, y: 100 },
		]);
		expect(startRadians).toBe(-Math.PI / 2);
		expect(endRadians).toBe(Math.PI / 2);
	});

	it("aims along the end segments alone on a bent path", () => {
		const { startRadians, endRadians } = calcArrowHeadRadians([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 50 },
		]);
		expect(startRadians).toBe(Math.PI);
		expect(endRadians).toBe(Math.PI / 2);
	});

	it("throws on a path of fewer than two points", () => {
		expect(() => calcArrowHeadRadians([{ x: 0, y: 0 }])).toThrow(TypeError);
		expect(() => calcArrowHeadRadians([])).toThrow(TypeError);
	});
});
