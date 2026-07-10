import { describe, it, expect } from "vitest";

import { calcInsetRect } from "../../geometry/calcInsetRect";

describe("calcInsetRect", () => {
	it("inset が空の場合は frame 全体の Rect を返す", () => {
		const result = calcInsetRect({ cx: 0, cy: 0, width: 100, height: 60 }, {});
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("top のみ指定した場合は上端だけ縮む", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 60 },
			{ top: 0.25 },
		);
		expect(result).toEqual({ x: -50, y: -15, width: 100, height: 45 });
	});

	it("4 辺すべての inset を適用できる", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 100 },
			{ top: 0.1, right: 0.2, bottom: 0.3, left: 0.4 },
		);
		expect(result).toEqual({ x: -10, y: -40, width: 40, height: 60 });
	});

	it("中心が原点以外の frame でも正しく計算する", () => {
		const result = calcInsetRect(
			{ cx: 200, cy: 100, width: 80, height: 40 },
			{ left: 0.5 },
		);
		expect(result).toEqual({ x: 200, y: 80, width: 40, height: 40 });
	});

	it("inset の合計が 1 を超える場合は幅・高さを 0 にクランプする", () => {
		const result = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 60 },
			{ top: 0.7, bottom: 0.7 },
		);
		expect(result.height).toBe(0);
		expect(result.width).toBe(100);
	});

	it("inset は frame サイズに追従する（同じ比率で異なるサイズ）", () => {
		const small = calcInsetRect(
			{ cx: 0, cy: 0, width: 100, height: 100 },
			{ top: 0.2 },
		);
		const large = calcInsetRect(
			{ cx: 0, cy: 0, width: 200, height: 200 },
			{ top: 0.2 },
		);
		expect(small.height).toBe(80);
		expect(large.height).toBe(160);
	});
});
