import { describe, it, expect } from "vitest";

import { calcClosestOrthogonalIntersection } from "../../geometry/calcClosestOrthogonalIntersection";

describe("calcClosestOrthogonalIntersection", () => {
	it("水平線（a=0）の場合、水平距離が短い方の交点を返す", () => {
		// y = 5 (a=0, b=5), 点(3, 10)
		// 垂直交点: (3, 5), 垂直距離|5-10|=5
		// 水平交点: a=0 なので p1.x=0 → (0, 10), 水平距離|0-3|=3 → 水平の方が近い
		const result = calcClosestOrthogonalIntersection(
			0,
			5,
			{ x: 0, y: 5 },
			3,
			10,
		);
		expect(result).toEqual({ x: 0, y: 10 });
	});

	it("y=xの直線（a=1, b=0）と点(4,0)の最近接交点", () => {
		// 垂直交点: x=4 → y=4: (4,4), 垂直距離|4-0|=4
		// 水平交点: y=0 → x=0: (0,0), 水平距離|0-4|=4
		// 等距離なので垂直交点(<=比較でvertical優先)
		const result = calcClosestOrthogonalIntersection(
			1,
			0,
			{ x: 0, y: 0 },
			4,
			0,
		);
		expect(result).toEqual({ x: 4, y: 4 });
	});

	it("y=xの直線と点(0,4)の最近接交点", () => {
		// 垂直交点: x=0 → y=0: (0,0), 垂直距離|0-4|=4
		// 水平交点: y=4 → x=4: (4,4), 水平距離|4-0|=4
		// 等距離なので垂直交点優先
		const result = calcClosestOrthogonalIntersection(
			1,
			0,
			{ x: 0, y: 0 },
			0,
			4,
		);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("y=2x+1の直線（a=2, b=1）と点(3,5)の最近接交点", () => {
		// 垂直交点: x=3 → y=7: (3,7), 垂直距離|7-5|=2
		// 水平交点: y=5 → x=2: (2,5), 水平距離|2-3|=1
		// 水平交点の方が近い
		const result = calcClosestOrthogonalIntersection(
			2,
			1,
			{ x: 0, y: 1 },
			3,
			5,
		);
		expect(result).toEqual({ x: 2, y: 5 });
	});
});
