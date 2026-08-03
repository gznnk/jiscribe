import { createInsetTextRegion } from "@workspace/canvas-sdk";
import { describe, it, expect } from "vitest";

import { DB_CAP_RATIO } from "../../../schema/db/DbDoc";

describe("db textRegion", () => {
	it("上キャップ全体と下の膨らみの内側に収める", () => {
		const textRegion = createInsetTextRegion({
			top: DB_CAP_RATIO * 2,
			bottom: DB_CAP_RATIO,
		});
		const result = textRegion({ width: 120, height: 100 }, "body");
		const capRy = 100 * DB_CAP_RATIO;
		expect(result.x).toBe(-60);
		expect(result.width).toBe(120);
		// 上端は上キャップ楕円の下端、下端は直線側面が終わる位置（膨らみの手前）
		expect(result.y).toBeCloseTo(-50 + capRy * 2, 6);
		expect(result.height).toBeCloseTo(100 - capRy * 3, 6);
	});
});
