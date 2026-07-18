import { describe, it, expect } from "vitest";

import { calcProjectionOntoLine } from "../../geometry/calcProjectionOntoLine";

describe("calcProjectionOntoLine", () => {
	it("水平線への投影はy座標だけが線に揃う", () => {
		const result = calcProjectionOntoLine(
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 3, y: 5 },
		);
		expect(result).toEqual({ x: 3, y: 0 });
	});

	it("垂直線への投影はx座標だけが線に揃う", () => {
		const result = calcProjectionOntoLine(
			{ x: 0, y: 0 },
			{ x: 0, y: 10 },
			{ x: 4, y: 7 },
		);
		expect(result).toEqual({ x: 0, y: 7 });
	});

	it("斜め45度の線への投影を返す", () => {
		const result = calcProjectionOntoLine(
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
			{ x: 4, y: 0 },
		);
		expect(result.x).toBeCloseTo(2);
		expect(result.y).toBeCloseTo(2);
	});

	it("線上の点はそのまま返る", () => {
		const result = calcProjectionOntoLine(
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 6, y: 0 },
		);
		expect(result).toEqual({ x: 6, y: 0 });
	});

	it("線分の外側でも直線への投影を返す（線分にクランプしない）", () => {
		const result = calcProjectionOntoLine(
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 15, y: 3 },
		);
		expect(result).toEqual({ x: 15, y: 0 });
	});

	it("p1とp2が同一点（退化した線）の場合はp1を返す", () => {
		const result = calcProjectionOntoLine(
			{ x: 2, y: 3 },
			{ x: 2, y: 3 },
			{ x: 8, y: 9 },
		);
		expect(result).toEqual({ x: 2, y: 3 });
	});

	it("p1がオフセットされた線でも正しく投影する", () => {
		const result = calcProjectionOntoLine(
			{ x: 5, y: 5 },
			{ x: 5, y: 15 },
			{ x: 1, y: 12 },
		);
		expect(result).toEqual({ x: 5, y: 12 });
	});
});
