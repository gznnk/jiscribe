import { describe, it, expect } from "vitest";

import { buildPolygonPath, buildRoundedRectPath } from "../pictogramPaths";

describe("buildPolygonPath", () => {
	it("closes the path through every corner in order", () => {
		expect(
			buildPolygonPath([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 5 },
			]),
		).toBe("M 0 0 L 10 0 L 10 5 Z");
	});

	it("yields an empty path when there is nothing to close", () => {
		expect(buildPolygonPath([])).toBe("");
		expect(buildPolygonPath([{ x: 3, y: 4 }])).toBe("");
	});
});

describe("buildRoundedRectPath", () => {
	it("clamps the radius to half the shorter side, so the corners cannot invert", () => {
		// A radius of 40 on a 20-tall box would overshoot; it must act as 10.
		expect(buildRoundedRectPath(0, 0, 100, 20, 40)).toBe(
			buildRoundedRectPath(0, 0, 100, 20, 10),
		);
	});

	it("keeps a radius that fits untouched", () => {
		expect(buildRoundedRectPath(0, 0, 100, 20, 4)).toContain("A 4 4 0 0 1");
	});
});
