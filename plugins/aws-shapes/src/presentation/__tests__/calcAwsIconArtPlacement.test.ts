import { describe, expect, it } from "vitest";

import {
	calcAwsIconArtPlacement,
	readViewBoxSize,
} from "../calcAwsIconArtPlacement";

describe("readViewBoxSize", () => {
	it("reads the width and height of the four-number form", () => {
		expect(readViewBoxSize("0 0 64 64")).toEqual({ width: 64, height: 64 });
		expect(readViewBoxSize("  0 0 40 40 ")).toEqual({ width: 40, height: 40 });
	});

	it("answers zero for anything it cannot read as numbers", () => {
		expect(readViewBoxSize("")).toEqual({ width: 0, height: 0 });
		expect(readViewBoxSize("0 0")).toEqual({ width: 0, height: 0 });
	});
});

describe("calcAwsIconArtPlacement", () => {
	it("fills a square box exactly and centres the drawing", () => {
		expect(calcAwsIconArtPlacement(64, 64, 64, 64)).toEqual({
			scale: 1,
			offsetX: -32,
			offsetY: -32,
		});
	});

	it("scales the viewBox to the box rather than assuming its size", () => {
		expect(calcAwsIconArtPlacement(96, 96, 48, 48).scale).toBe(2);
		expect(calcAwsIconArtPlacement(80, 80, 40, 40).scale).toBe(2);
	});

	it("fits the smaller side and leaves the rest as margin", () => {
		const placement = calcAwsIconArtPlacement(128, 64, 64, 64);
		expect(placement.scale).toBe(1);
		expect(placement.offsetX).toBe(-32);
		expect(placement.offsetY).toBe(-32);
	});

	it("draws nothing for a box or a viewBox with no area", () => {
		expect(calcAwsIconArtPlacement(0, 64, 64, 64).scale).toBe(0);
		expect(calcAwsIconArtPlacement(-10, 64, 64, 64).scale).toBe(0);
		expect(calcAwsIconArtPlacement(64, 64, 0, 0).scale).toBe(0);
	});
});
