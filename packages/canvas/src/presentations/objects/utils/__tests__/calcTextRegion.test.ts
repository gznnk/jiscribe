import { describe, it, expect } from "vitest";

import { calcDbTextRegion } from "../../primitives/Db";
import { calcDiamondTextRegion } from "../../primitives/Diamond";
import { calcEllipseTextRegion } from "../../primitives/Ellipse";
import { calcHexagonTextRegion } from "../../primitives/Hexagon";
import { calcParallelogramTextRegion } from "../../primitives/Parallelogram";
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

describe("calcDiamondTextRegion", () => {
	it("角が辺に接する幅・高さ半分の領域を返す", () => {
		const result = calcDiamondTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -25, y: -15, width: 50, height: 30 });
	});
});

describe("calcEllipseTextRegion", () => {
	it("楕円に内接する w/√2 × h/√2 の領域を返す", () => {
		const result = calcEllipseTextRegion({ width: 100, height: 60 });
		expect(result.width).toBeCloseTo(100 / Math.SQRT2, 6);
		expect(result.height).toBeCloseTo(60 / Math.SQRT2, 6);
		expect(result.x).toBeCloseTo(-100 / Math.SQRT2 / 2, 6);
		expect(result.y).toBeCloseTo(-60 / Math.SQRT2 / 2, 6);
	});
});

describe("calcHexagonTextRegion", () => {
	it("両側をキャップ1つ分インセットした領域を返す", () => {
		const result = calcHexagonTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -30, y: -30, width: 60, height: 60 });
	});
});

describe("calcParallelogramTextRegion", () => {
	it("両側をスキュー1つ分インセットした領域を返す", () => {
		const result = calcParallelogramTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -28, y: -30, width: 56, height: 60 });
	});
});

describe("calcStadiumTextRegion", () => {
	it("横長ではキャップ半径（短辺の半分）を左右にインセットする", () => {
		const result = calcStadiumTextRegion({ width: 200, height: 80 });
		expect(result).toEqual({ x: -60, y: -40, width: 120, height: 80 });
	});

	it("縦長ではキャップ半径を上下にインセットする", () => {
		const result = calcStadiumTextRegion({ width: 40, height: 200 });
		expect(result).toEqual({ x: -20, y: -80, width: 40, height: 160 });
	});
});
