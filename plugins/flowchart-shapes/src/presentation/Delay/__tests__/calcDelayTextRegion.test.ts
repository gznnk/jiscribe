import { describe, it, expect } from "vitest";

import { calcDelayTextRegion } from "../calcDelayTextRegion";

describe("calcDelayTextRegion", () => {
	it("右をキャップ半径（height/2）分インセットする（アスペクト比に追従）", () => {
		// 100x80: r = 40 → 右端は w/2 - r = 10（直線辺の終端）に一致。
		// 定数比だと height > 0.4*width で右角がはみ出す。
		const result = calcDelayTextRegion({ width: 100, height: 80 }, "body");
		expect(result).toEqual({ x: -50, y: -40, width: 60, height: 80 });
	});
});
