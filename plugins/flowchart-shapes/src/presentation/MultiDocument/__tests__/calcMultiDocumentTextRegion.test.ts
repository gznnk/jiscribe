import { describe, it, expect } from "vitest";

import { calcMultiDocumentTextRegion } from "../../../schema/textRegions";
import { calcMultiDocumentSheets } from "../calcMultiDocumentSheets";

/** The front sheet in local (centered) coordinates: the one the text belongs to. */
const frontSheet = (width: number, height: number) =>
	calcMultiDocumentSheets(-width / 2, -height / 2, width, height)[2];

describe("calcMultiDocumentTextRegion", () => {
	it("keeps the text inside the front sheet, clear of the ones behind it", () => {
		const region = calcMultiDocumentTextRegion({ width: 200, height: 120 });
		const front = frontSheet(200, 120);
		expect(region.x).toBeGreaterThanOrEqual(front.x);
		expect(region.x + region.width).toBeLessThanOrEqual(
			front.x + front.width + 0.0001,
		);
		expect(region.y).toBeGreaterThanOrEqual(front.y - 0.0001);
	});

	it("insets the top and right by the two sheet offsets", () => {
		// 200x120: offset = min(200, 120) * 0.08 = 9.6.
		const region = calcMultiDocumentTextRegion({ width: 200, height: 120 });
		expect(region.y).toBeCloseTo(-60 + 2 * 9.6);
		expect(region.x + region.width).toBeCloseTo(100 - 2 * 9.6);
	});

	it("leaves the left edge at the box, which is where the front sheet starts", () => {
		const region = calcMultiDocumentTextRegion({ width: 200, height: 120 });
		expect(region.x).toBeCloseTo(-100);
	});

	it("stops above the front sheet's wave band, so text cannot sit on the curve", () => {
		// Front sheet height = 120 - 2 * 9.6 = 100.8; wave band = 100.8 * 0.075 * 2.
		const region = calcMultiDocumentTextRegion({ width: 200, height: 120 });
		expect(region.y + region.height).toBeCloseTo(60 - 100.8 * 0.075 * 2);
	});

	it("takes the offset from the shorter side, so a wide box is not over-inset", () => {
		// 400x100: offset follows the height (100 * 0.08), not the width.
		const region = calcMultiDocumentTextRegion({ width: 400, height: 100 });
		expect(region.y).toBeCloseTo(-50 + 2 * 8);
		expect(region.x + region.width).toBeCloseTo(200 - 2 * 8);
	});

	it("scales with the box, since every inset is a ratio", () => {
		const small = calcMultiDocumentTextRegion({ width: 200, height: 120 });
		const large = calcMultiDocumentTextRegion({ width: 400, height: 240 });
		expect(large.width).toBeCloseTo(small.width * 2);
		expect(large.height).toBeCloseTo(small.height * 2);
	});

	it("keeps a positive region on a box small enough for the insets to bite", () => {
		const region = calcMultiDocumentTextRegion({ width: 40, height: 30 });
		expect(region.width).toBeGreaterThan(0);
		expect(region.height).toBeGreaterThan(0);
	});
});
