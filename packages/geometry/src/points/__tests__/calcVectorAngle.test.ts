import { describe, it, expect } from "vitest";

import { calcVectorAngle } from "../calcVectorAngle";

describe("calcVectorAngle", () => {
	it("右方向（3時）は0ラジアン", () => {
		expect(calcVectorAngle(0, 0, 1, 0)).toBeCloseTo(0);
	});

	it("下方向（6時）はπ/2ラジアン", () => {
		expect(calcVectorAngle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
	});

	it("左方向（9時）は±πラジアン", () => {
		expect(Math.abs(calcVectorAngle(0, 0, -1, 0))).toBeCloseTo(Math.PI);
	});

	it("上方向（12時）は-π/2ラジアン", () => {
		expect(calcVectorAngle(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2);
	});

	it("原点が(0,0)以外でも計算できる", () => {
		// (1,1) → (2,1) は右方向
		expect(calcVectorAngle(1, 1, 2, 1)).toBeCloseTo(0);
	});
});
