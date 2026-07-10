import { describe, it, expect } from "vitest";

import { calcTextRegion } from "../calcTextRegion";

describe("calcTextRegion", () => {
	it("spec 省略時は bbox 全体（中心原点のローカル座標）を返す", () => {
		const result = calcTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("ratio inset の spec を適用した領域を返す", () => {
		const result = calcTextRegion(
			{ width: 100, height: 60 },
			{ unit: "ratio", inset: { top: 0.25 } },
		);
		expect(result).toEqual({ x: -50, y: -15, width: 100, height: 45 });
	});

	it("inset が空の spec は spec 省略時と同じ領域を返す", () => {
		const withEmptySpec = calcTextRegion(
			{ width: 80, height: 40 },
			{ unit: "ratio", inset: {} },
		);
		const withoutSpec = calcTextRegion({ width: 80, height: 40 });
		expect(withEmptySpec).toEqual(withoutSpec);
	});
});
