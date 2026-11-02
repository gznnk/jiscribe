import { describe, expect, it } from "vitest";

import { computeStencilBarTop } from "../utils/computeStencilBarTop";

describe("computeStencilBarTop", () => {
	it("centres the bar when the leftover height is even", () => {
		expect(computeStencilBarTop(500, 200)).toBe(150);
	});

	it("rounds an odd leftover down to a whole pixel", () => {
		expect(computeStencilBarTop(501, 200)).toBe(150);
	});

	it("keeps the bar at the band's top when the band is no taller", () => {
		expect(computeStencilBarTop(200, 200)).toBe(0);
		expect(computeStencilBarTop(150, 200)).toBe(0);
	});
});
