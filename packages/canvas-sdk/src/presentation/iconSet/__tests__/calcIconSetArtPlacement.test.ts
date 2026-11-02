import { describe, expect, it } from "vitest";

import {
	calcIconSetArtPlacement,
	readIconSetViewBoxSize,
} from "../calcIconSetArtPlacement";

describe("readIconSetViewBoxSize", () => {
	it("reads the width and height of the four-number form", () => {
		expect(readIconSetViewBoxSize("0 0 64 64")).toEqual({
			width: 64,
			height: 64,
		});
		expect(readIconSetViewBoxSize("  0 0 40 40 ")).toEqual({
			width: 40,
			height: 40,
		});
	});

	it("answers zero for anything it cannot read as numbers", () => {
		expect(readIconSetViewBoxSize("")).toEqual({ width: 0, height: 0 });
		expect(readIconSetViewBoxSize("0 0")).toEqual({ width: 0, height: 0 });
	});
});

describe("calcIconSetArtPlacement", () => {
	it("fills a square box exactly and centres the drawing", () => {
		expect(calcIconSetArtPlacement(64, 64, 64, 64)).toEqual({
			scale: 1,
			offsetX: -32,
			offsetY: -32,
		});
	});

	it("scales the viewBox to the box rather than assuming its size", () => {
		expect(calcIconSetArtPlacement(96, 96, 48, 48).scale).toBe(2);
		expect(calcIconSetArtPlacement(80, 80, 40, 40).scale).toBe(2);
	});

	it("fits the smaller side and leaves the rest as margin", () => {
		const placement = calcIconSetArtPlacement(128, 64, 64, 64);
		expect(placement.scale).toBe(1);
		expect(placement.offsetX).toBe(-32);
		expect(placement.offsetY).toBe(-32);
	});

	it("draws nothing for a box or a viewBox with no area", () => {
		expect(calcIconSetArtPlacement(0, 64, 64, 64).scale).toBe(0);
		expect(calcIconSetArtPlacement(-10, 64, 64, 64).scale).toBe(0);
		expect(calcIconSetArtPlacement(64, 64, 0, 0).scale).toBe(0);
	});
});
