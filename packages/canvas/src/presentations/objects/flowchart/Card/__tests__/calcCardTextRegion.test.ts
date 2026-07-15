import { describe, it, expect } from "vitest";

import { calcCardTextRegion } from "../calcCardTextRegion";

describe("calcCardTextRegion", () => {
	it("カット角の下（全幅）に収める（アスペクト比に追従）", () => {
		// 120x80: cut = min(120,80) * 0.25 = 20 → 上インセット 20/80 = 0.25。
		// 定数比だと角の切り欠きにはみ出す。
		const result = calcCardTextRegion({ width: 120, height: 80 });
		expect(result).toEqual({ x: -60, y: -20, width: 120, height: 60 });
	});
});
