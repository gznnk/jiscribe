import { describe, it, expect } from "vitest";

import { calcDbTextRegion } from "../calcDbTextRegion";

describe("calcDbTextRegion", () => {
	it("上キャップ全体と下の膨らみの内側に収める", () => {
		const result = calcDbTextRegion({ width: 120, height: 100 });
		const capRy = 100 * 0.12;
		expect(result.x).toBe(-60);
		expect(result.width).toBe(120);
		// 上端は上キャップ楕円の下端、下端は直線側面が終わる位置（膨らみの手前）
		expect(result.y).toBeCloseTo(-50 + capRy * 2, 6);
		expect(result.height).toBeCloseTo(100 - capRy * 3, 6);
	});
});
