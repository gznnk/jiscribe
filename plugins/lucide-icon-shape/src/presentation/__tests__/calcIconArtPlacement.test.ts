import { describe, expect, it } from "vitest";

import { calcIconArtPlacement } from "../calcIconArtPlacement";

describe("calcIconArtPlacement", () => {
	it("fills a square box exactly, centred on the origin", () => {
		const { scale, offset } = calcIconArtPlacement(48, 48, 2);
		expect(scale).toBe(2);
		expect(offset).toBe(-24);
	});

	it("scales to the smaller side, so a wide box shows margin", () => {
		const wide = calcIconArtPlacement(200, 50, 2);
		const tall = calcIconArtPlacement(50, 200, 2);
		expect(wide.scale).toBe(tall.scale);
		expect(wide.scale * 24).toBe(50);
	});

	it("divides the stroke width by the scale so it survives scaling unchanged", () => {
		const { scale, artStrokeWidth } = calcIconArtPlacement(96, 96, 2);
		expect(artStrokeWidth * scale).toBe(2);
	});

	it("treats an unset stroke width as unstroked", () => {
		expect(calcIconArtPlacement(48, 48, undefined).artStrokeWidth).toBe(0);
	});

	it("reports a scale of 0 for a box with no area, which draws nothing", () => {
		expect(calcIconArtPlacement(0, 48, 2)).toEqual({
			scale: 0,
			offset: 0,
			artStrokeWidth: 0,
		});
		expect(calcIconArtPlacement(48, -10, 2).scale).toBe(0);
	});

	it("reports a scale of 0 rather than NaN for a box of unknown size", () => {
		expect(calcIconArtPlacement(Number.NaN, 48, 2).scale).toBe(0);
	});
});
