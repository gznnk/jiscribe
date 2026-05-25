import { describe, it, expect } from "vitest";

import { calcPolyBoundingBox } from "../../geometry/calcPolyBoundingBox";

describe("calcPolyBoundingBox", () => {
	it("空配列の場合はnullを返す", () => {
		expect(calcPolyBoundingBox([])).toBeNull();
	});

	it("1点の場合はその点をBBとして返す", () => {
		const result = calcPolyBoundingBox([{ x: 5, y: 3 }]);
		expect(result).toEqual({ left: 5, right: 5, top: 3, bottom: 3 });
	});

	it("複数点のBBを正しく計算する", () => {
		const points = [
			{ x: 1, y: 4 },
			{ x: 5, y: 2 },
			{ x: 3, y: 7 },
			{ x: -1, y: 1 },
		];
		const result = calcPolyBoundingBox(points);
		expect(result).toEqual({ left: -1, right: 5, top: 1, bottom: 7 });
	});

	it("全点が同じ座標の場合", () => {
		const result = calcPolyBoundingBox([
			{ x: 2, y: 3 },
			{ x: 2, y: 3 },
		]);
		expect(result).toEqual({ left: 2, right: 2, top: 3, bottom: 3 });
	});
});
