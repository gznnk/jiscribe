import { describe, it, expect } from "vitest";

import { calcProjectedPointOnLine } from "../../geometry/calcProjectedPointOnLine";

describe("calcProjectedPointOnLine", () => {
	it("水平線への投影はy座標だけが線に揃う", () => {
		const result = calcProjectedPointOnLine(
			{ x: 3, y: 5 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 3, y: 0 });
	});

	it("垂直線への投影はx座標だけが線に揃う", () => {
		const result = calcProjectedPointOnLine(
			{ x: 4, y: 7 },
			{ x: 0, y: 0 },
			{ x: 0, y: 10 },
		);
		expect(result).toEqual({ x: 0, y: 7 });
	});

	it("斜め45度の線への投影を返す", () => {
		const result = calcProjectedPointOnLine(
			{ x: 4, y: 0 },
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		);
		expect(result.x).toBeCloseTo(2);
		expect(result.y).toBeCloseTo(2);
	});

	it("線上の点はそのまま返る", () => {
		const result = calcProjectedPointOnLine(
			{ x: 6, y: 0 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 6, y: 0 });
	});

	it("線分の外側でも直線への投影を返す（線分にクランプしない）", () => {
		const result = calcProjectedPointOnLine(
			{ x: 15, y: 3 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 15, y: 0 });
	});

	it("lineStartとlineEndが同一点（退化した線）の場合はlineStartを返す", () => {
		const result = calcProjectedPointOnLine(
			{ x: 8, y: 9 },
			{ x: 2, y: 3 },
			{ x: 2, y: 3 },
		);
		expect(result).toEqual({ x: 2, y: 3 });
	});

	it("lineStartがオフセットされた線でも正しく投影する", () => {
		const result = calcProjectedPointOnLine(
			{ x: 1, y: 12 },
			{ x: 5, y: 5 },
			{ x: 5, y: 15 },
		);
		expect(result).toEqual({ x: 5, y: 12 });
	});
});
