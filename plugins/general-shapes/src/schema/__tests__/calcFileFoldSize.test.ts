import { describe, it, expect } from "vitest";

import { calcFileFoldSize } from "../file/calcFileFoldSize";
import { calcFileTextRegion } from "../textRegions";

describe("calcFileFoldSize", () => {
	it("takes the height when the box is portrait", () => {
		// min(100 * 0.3, 120 * 0.28) = min(30, 33.6)
		expect(calcFileFoldSize(100, 120)).toBeCloseTo(30);
	});

	it("takes the height when the box is short and wide, so the fold cannot shear", () => {
		// min(200 * 0.3, 40 * 0.28) = min(60, 11.2)
		expect(calcFileFoldSize(200, 40)).toBeCloseTo(11.2);
	});

	it("collapses to zero for a zero-sized box rather than going negative", () => {
		expect(calcFileFoldSize(0, 120)).toBe(0);
	});
});

describe("calcFileTextRegion", () => {
	it("starts the text below the fold", () => {
		const fold = calcFileFoldSize(100, 120);
		const region = calcFileTextRegion({ width: 100, height: 120 });
		expect(region.y).toBeGreaterThan(-120 / 2 + fold);
	});

	it("follows the fold when the aspect ratio changes which ratio wins", () => {
		// Portrait: the width ratio wins, so the fold is under the 0.28 height cap
		// and the text starts proportionally higher than on a box that hits the cap.
		const portrait = calcFileTextRegion({ width: 100, height: 120 });
		const capped = calcFileTextRegion({ width: 200, height: 40 });
		expect((portrait.y + 60) / 120).toBeLessThan((capped.y + 20) / 40);
		// The cap plus the padding is as far down as the text can ever start.
		expect((capped.y + 20) / 40).toBeCloseTo(0.28 + 0.06);
	});
});
