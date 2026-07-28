import { describe, it, expect } from "vitest";

import { calcDiamondTextRegion } from "../calcDiamondTextRegion";

describe("calcDiamondTextRegion", () => {
	it("角が辺に接する幅・高さ半分の領域を返す", () => {
		const result = calcDiamondTextRegion({ width: 100, height: 60 }, "body");
		expect(result).toEqual({ x: -25, y: -15, width: 50, height: 30 });
	});
});
