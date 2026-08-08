import { describe, expect, it } from "vitest";

import { calcNoteFoldSize } from "../calcNoteFoldSize";
import { calcNoteTextRegion } from "../calcNoteTextRegion";

describe("calcNoteTextRegion", () => {
	it("gives up the fold on the right and keeps the whole height", () => {
		const region = calcNoteTextRegion({ width: 180, height: 110 }, "body");
		expect(region.x).toBe(-90);
		expect(region.y).toBe(-55);
		expect(region.width).toBeCloseTo(180 - calcNoteFoldSize(180, 110));
		expect(region.height).toBe(110);
	});

	it("stops short of the fold's inner corner, so no line can run under it", () => {
		const { width, height } = { width: 180, height: 110 };
		const region = calcNoteTextRegion({ width, height }, "body");
		const foldInnerX = width / 2 - calcNoteFoldSize(width, height);
		expect(region.x + region.width).toBeCloseTo(foldInnerX);
	});

	it("follows the fold when the shorter side changes which one it is taken from", () => {
		// Portrait: the fold comes off the width, so it costs proportionally more.
		const portrait = calcNoteTextRegion({ width: 110, height: 300 }, "body");
		const landscape = calcNoteTextRegion({ width: 300, height: 110 }, "body");
		expect(portrait.width).toBeCloseTo(88);
		expect(landscape.width).toBeCloseTo(278);
	});

	it("returns the box itself for a zero-width note instead of NaN", () => {
		const region = calcNoteTextRegion({ width: 0, height: 110 }, "body");
		expect(region.width).toBe(0);
		expect(region.height).toBe(110);
	});
});
