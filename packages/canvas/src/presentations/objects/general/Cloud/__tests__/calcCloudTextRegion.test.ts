import { describe, it, expect } from "vitest";

import { expectRectCloseTo } from "../../../__tests__/support/expectRectCloseTo";
import { calcCloudTextRegion } from "../calcCloudTextRegion";

describe("calcCloudTextRegion", () => {
	it("insets the box by the bump ratios and stays centered on the origin", () => {
		const region = calcCloudTextRegion({ width: 200, height: 100 });
		expectRectCloseTo(region, { x: -70, y: -30, width: 140, height: 60 });
		expect(region.x + region.width / 2).toBeCloseTo(0);
		expect(region.y + region.height / 2).toBeCloseTo(0);
	});

	it("keeps the insets proportional to the box size", () => {
		const small = calcCloudTextRegion({ width: 100, height: 50 });
		const large = calcCloudTextRegion({ width: 200, height: 100 });
		expect(large.width).toBeCloseTo(small.width * 2);
		expect(large.height).toBeCloseTo(small.height * 2);
	});

	it("stays strictly inside the bounding box, clear of the bumps", () => {
		const [width, height] = [200, 100];
		const region = calcCloudTextRegion({ width, height });
		expect(region.x).toBeGreaterThan(-width / 2);
		expect(region.x + region.width).toBeLessThan(width / 2);
		expect(region.y).toBeGreaterThan(-height / 2);
		expect(region.y + region.height).toBeLessThan(height / 2);
	});

	it("collapses to zero for a zero-sized box", () => {
		expectRectCloseTo(calcCloudTextRegion({ width: 0, height: 0 }), {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		});
	});
});
