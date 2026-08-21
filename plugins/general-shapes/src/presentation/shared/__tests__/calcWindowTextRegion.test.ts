import { describe, it, expect } from "vitest";

import { WINDOW_TITLE_BAR_RATIO } from "../buildWindowFrame";
import { calcWindowTextRegion } from "../calcWindowTextRegion";

describe("calcWindowTextRegion", () => {
	it("starts the text below the title bar, so a line cannot run into it", () => {
		const region = calcWindowTextRegion({ width: 200, height: 100 }, "body");
		const titleBarBottom = -100 / 2 + 100 * WINDOW_TITLE_BAR_RATIO;
		expect(region.y).toBeGreaterThan(titleBarBottom);
	});

	it("insets top, right, bottom and left by the declared ratios", () => {
		// Padding 0.06 on every side; the top additionally clears the 0.24 bar.
		const region = calcWindowTextRegion({ width: 200, height: 100 }, "body");
		expect(region.x).toBeCloseTo(-100 + 200 * 0.06);
		expect(region.width).toBeCloseTo(200 * (1 - 0.06 * 2));
		expect(region.y).toBeCloseTo(-50 + 100 * (WINDOW_TITLE_BAR_RATIO + 0.06));
		expect(region.height).toBeCloseTo(
			100 * (1 - WINDOW_TITLE_BAR_RATIO - 0.06 * 2),
		);
	});

	it("stays inside the box", () => {
		const region = calcWindowTextRegion({ width: 200, height: 100 }, "body");
		expect(region.x).toBeGreaterThanOrEqual(-100);
		expect(region.y).toBeGreaterThanOrEqual(-50);
		expect(region.x + region.width).toBeLessThanOrEqual(100);
		expect(region.y + region.height).toBeLessThanOrEqual(50);
	});

	it("scales with the box, since the insets are ratios rather than pixels", () => {
		const small = calcWindowTextRegion({ width: 200, height: 100 }, "body");
		const large = calcWindowTextRegion({ width: 400, height: 200 }, "body");
		expect(large.width).toBeCloseTo(small.width * 2);
		expect(large.height).toBeCloseTo(small.height * 2);
	});

	it("is centered horizontally, the bar only takes from the top", () => {
		const region = calcWindowTextRegion({ width: 200, height: 100 }, "body");
		expect(region.x + region.width / 2).toBeCloseTo(0);
	});
});
