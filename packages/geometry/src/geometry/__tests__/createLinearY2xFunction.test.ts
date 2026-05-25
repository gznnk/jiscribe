import { describe, it, expect } from "vitest";

import { createLinearY2xFunction } from "../../geometry/createLinearY2xFunction";

// createLinearY2xFunction は (p1, p2) から (x: number, y: number) => Point を生成する
// 水平・垂直直線のうち近い方の交点 Point を返す
describe("createLinearY2xFunction", () => {
	it("y = x の直線: (5, 0) に対して水平交点を返す", () => {
		// y=x (a=1, b=0), 外点(5, 0): 垂直交点(5,5) 距離5, 水平交点(0,0) 距離5 → 垂直距離=水平距離なので垂直優先
		const fn = createLinearY2xFunction({ x: 0, y: 0 }, { x: 1, y: 1 });
		const result = fn(5, 0);
		// 垂直距離=水平距離なので垂直交点が返る
		expect(result).toEqual({ x: 5, y: 5 });
	});

	it("y = 2x + 1: (3, 5) に対して水平交点を返す", () => {
		// 垂直交点: x=3 → y=7: (3,7), 垂直距離|7-5|=2
		// 水平交点: y=5 → x=2: (2,5), 水平距離|2-3|=1 → 水平の方が近い
		const fn = createLinearY2xFunction({ x: 0, y: 1 }, { x: 1, y: 3 });
		const result = fn(3, 5);
		expect(result).toEqual({ x: 2, y: 5 });
	});

	it("垂直線（slope=∞）の場合は入力yに対応した交点を返す", () => {
		// !isFinite(a) の特殊ケース: 常に { x: p1.x, y: input_y } を返す
		const fn = createLinearY2xFunction({ x: 7, y: 0 }, { x: 7, y: 10 });
		expect(fn(0, 3)).toEqual({ x: 7, y: 3 });
		expect(fn(0, 99)).toEqual({ x: 7, y: 99 });
	});
});
