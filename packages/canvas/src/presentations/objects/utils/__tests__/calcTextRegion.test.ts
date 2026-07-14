import { describe, it, expect } from "vitest";

import { calcCardTextRegion } from "../../flowchart/Card";
import { calcDbTextRegion } from "../../flowchart/Db";
import { calcDelayTextRegion } from "../../flowchart/Delay";
import { calcDiamondTextRegion } from "../../flowchart/Diamond";
import { calcHexagonTextRegion } from "../../flowchart/Hexagon";
import { calcParallelogramTextRegion } from "../../flowchart/Parallelogram";
import { calcStadiumTextRegion } from "../../flowchart/Stadium";
import { calcEllipseTextRegion } from "../../primitives/Ellipse";
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

describe("calcCardTextRegion", () => {
	it("カット角の下（全幅）に収める（アスペクト比に追従）", () => {
		// 120x80: cut = min(120,80) * 0.25 = 20 → 上インセット 20/80 = 0.25。
		// 定数比だと角の切り欠きにはみ出す。
		const result = calcCardTextRegion({ width: 120, height: 80 });
		expect(result).toEqual({ x: -60, y: -20, width: 120, height: 60 });
	});
});

describe("calcDbTextRegion", () => {
	it("上キャップ全体と下の膨らみの内側に収める", () => {
		const result = calcDbTextRegion({ width: 120, height: 100 });
		const capRy = 100 * 0.12;
		expect(result.x).toBe(-60);
		expect(result.width).toBe(120);
		// 上端は上キャップ楕円の下端、下端は直線側面が終わる位置（膨らみの手前）
		expect(result.y).toBeCloseTo(-50 + capRy * 2, 6);
		expect(result.height).toBeCloseTo(100 - capRy * 3, 6);
	});
});

describe("calcDelayTextRegion", () => {
	it("右をキャップ半径（height/2）分インセットする（アスペクト比に追従）", () => {
		// 100x80: r = 40 → 右端は w/2 - r = 10（直線辺の終端）に一致。
		// 定数比だと height > 0.4*width で右角がはみ出す。
		const result = calcDelayTextRegion({ width: 100, height: 80 });
		expect(result).toEqual({ x: -50, y: -40, width: 60, height: 80 });
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
