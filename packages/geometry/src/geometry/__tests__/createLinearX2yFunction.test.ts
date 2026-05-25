import { describe, it, expect } from "vitest";

import { createLinearX2yFunction } from "../../geometry/createLinearX2yFunction";

// createLinearX2yFunction は (p1, p2) から (x: number, y: number) => Point を生成する
// 水平・垂直直線のうち近い方の交点 Point を返す
describe("createLinearX2yFunction", () => {
	it("y = x の直線: (0, 外点) に対して垂直交点を返す", () => {
		// y=x (a=1, b=0), 外点(0, 5): 垂直交点(0,0) 距離5, 水平交点(5,5) 距離5 → 等距離なので垂直優先
		const fn = createLinearX2yFunction({ x: 0, y: 0 }, { x: 1, y: 1 });
		const result = fn(0, 5);
		expect(result).toEqual({ x: 0, y: 0 });
	});

	it("y = x の直線: (4, 0) に対して垂直交点を返す", () => {
		// 垂直交点(4,4) 距離4, 水平交点(0,0) 距離4 → 等距離なので垂直優先
		const fn = createLinearX2yFunction({ x: 0, y: 0 }, { x: 1, y: 1 });
		const result = fn(4, 0);
		expect(result).toEqual({ x: 4, y: 4 });
	});

	it("水平線（slope=0）の場合は入力xに対応した交点を返す", () => {
		// a=0 の特殊ケース: 常に { x: input_x, y: p1.y } を返す
		const fn = createLinearX2yFunction({ x: 0, y: 5 }, { x: 10, y: 5 });
		expect(fn(3, 10)).toEqual({ x: 3, y: 5 });
		expect(fn(99, 0)).toEqual({ x: 99, y: 5 });
	});
});
