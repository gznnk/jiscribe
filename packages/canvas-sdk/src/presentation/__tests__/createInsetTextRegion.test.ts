import { describe, it, expect } from "vitest";

import { createInsetTextRegion } from "../createInsetTextRegion";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("createInsetTextRegion", () => {
	it("insets each side by its own ratio of the box", () => {
		const calc = createInsetTextRegion({
			top: 0.1,
			right: 0.2,
			bottom: 0.3,
			left: 0.4,
		});
		expect(
			calc({ width: 200, height: 100 }, "body", TEXT_REGION_CONTEXT),
		).toEqual({
			x: -100 + 80,
			y: -50 + 10,
			width: 200 - 80 - 40,
			height: 100 - 10 - 30,
		});
	});

	it("treats an omitted edge as no inset", () => {
		const calc = createInsetTextRegion({ top: 0.25 });
		expect(
			calc({ width: 100, height: 60 }, "body", TEXT_REGION_CONTEXT),
		).toEqual({
			x: -50,
			y: -15,
			width: 100,
			height: 45,
		});
	});

	it("reuses the same insets across calls, regardless of box size", () => {
		const calc = createInsetTextRegion({ left: 0.25, right: 0.25 });
		const small = calc({ width: 100, height: 50 }, "body", TEXT_REGION_CONTEXT);
		const large = calc(
			{ width: 200, height: 100 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(large.width).toBeCloseTo(small.width * 2);
		expect(large.height).toBeCloseTo(small.height * 2);
	});

	it("collapses width to zero for insets that sum past the box", () => {
		const calc = createInsetTextRegion({ left: 0.6, right: 0.6 });
		expect(
			calc({ width: 100, height: 60 }, "body", TEXT_REGION_CONTEXT),
		).toEqual({
			x: 10,
			y: -30,
			width: 0,
			height: 60,
		});
	});
});
