import { describe, it, expect } from "vitest";

import { calcDbTextRegion } from "../../primitives/Db";
import { calcHexagonTextRegion } from "../../primitives/Hexagon";
import { calcStadiumTextRegion } from "../../primitives/Stadium";
import { calcTextRegion } from "../calcTextRegion";

describe("calcTextRegion", () => {
	it("calculator 省略時は bbox 全体（中心原点のローカル座標）を返す", () => {
		const result = calcTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("calculator が指定されたらその結果を返す", () => {
		const result = calcTextRegion({ width: 100, height: 60 }, ({ width }) => ({
			x: 0,
			y: 0,
			width: width / 2,
			height: 10,
		}));
		expect(result).toEqual({ x: 0, y: 0, width: 50, height: 10 });
	});
});

describe("calcDbTextRegion", () => {
	it("キャップ下端から始まる胴体領域を返す", () => {
		const result = calcDbTextRegion({ width: 120, height: 100 });
		const capBottom = -50 + 100 * 0.12 * 2;
		expect(result).toEqual({
			x: -60,
			y: capBottom,
			width: 120,
			height: 50 - capBottom,
		});
	});
});

describe("calcHexagonTextRegion", () => {
	it("両側を半キャップ分インセットした領域を返す", () => {
		const result = calcHexagonTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -40, y: -30, width: 80, height: 60 });
	});
});

describe("calcStadiumTextRegion", () => {
	it("横長ではインセットが短辺（高さ）に追従する", () => {
		const result = calcStadiumTextRegion({ width: 200, height: 80 });
		expect(result).toEqual({ x: -80, y: -40, width: 160, height: 80 });
	});

	it("縦長ではインセットが幅に追従する", () => {
		const result = calcStadiumTextRegion({ width: 40, height: 200 });
		expect(result).toEqual({ x: -10, y: -100, width: 20, height: 200 });
	});
});
