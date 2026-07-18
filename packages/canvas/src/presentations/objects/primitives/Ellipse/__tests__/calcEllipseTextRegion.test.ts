import { describe, it, expect } from "vitest";

import { calcEllipseTextRegion } from "../calcEllipseTextRegion";

describe("calcEllipseTextRegion", () => {
	it("楕円に内接する w/√2 × h/√2 の領域を返す", () => {
		const result = calcEllipseTextRegion({ width: 100, height: 60 });
		expect(result.width).toBeCloseTo(100 / Math.SQRT2, 6);
		expect(result.height).toBeCloseTo(60 / Math.SQRT2, 6);
		expect(result.x).toBeCloseTo(-100 / Math.SQRT2 / 2, 6);
		expect(result.y).toBeCloseTo(-60 / Math.SQRT2 / 2, 6);
	});
});
