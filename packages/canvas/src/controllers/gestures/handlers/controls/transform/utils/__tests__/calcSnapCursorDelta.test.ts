import { describe, it, expect } from "vitest";

import type { TransformAnchorType } from "../../TransformAnchorType";
import {
	calcSnapCursorDelta,
	getAnchorXSnapEdge,
	getAnchorYSnapEdge,
} from "../calcSnapCursorDelta";

// ─── getAnchorXSnapEdge ────────────────────────────────────────────────────

describe("getAnchorXSnapEdge", () => {
	describe("スケール正（反転なし）", () => {
		it("topRight → right", () => {
			expect(getAnchorXSnapEdge("topRight", 1)).toBe("right");
		});
		it("bottomRight → right", () => {
			expect(getAnchorXSnapEdge("bottomRight", 1)).toBe("right");
		});
		it("rightCenter → right", () => {
			expect(getAnchorXSnapEdge("rightCenter", 1)).toBe("right");
		});
		it("topLeft → left", () => {
			expect(getAnchorXSnapEdge("topLeft", 1)).toBe("left");
		});
		it("bottomLeft → left", () => {
			expect(getAnchorXSnapEdge("bottomLeft", 1)).toBe("left");
		});
		it("leftCenter → left", () => {
			expect(getAnchorXSnapEdge("leftCenter", 1)).toBe("left");
		});
		it("topCenter → null（左右端でない）", () => {
			expect(getAnchorXSnapEdge("topCenter", 1)).toBeNull();
		});
		it("bottomCenter → null", () => {
			expect(getAnchorXSnapEdge("bottomCenter", 1)).toBeNull();
		});
	});

	describe("スケール負（水平反転）", () => {
		it("topRight → left（反転）", () => {
			expect(getAnchorXSnapEdge("topRight", -1)).toBe("left");
		});
		it("topLeft → right（反転）", () => {
			expect(getAnchorXSnapEdge("topLeft", -1)).toBe("right");
		});
	});
});

// ─── getAnchorYSnapEdge ────────────────────────────────────────────────────

describe("getAnchorYSnapEdge", () => {
	describe("スケール正（反転なし）", () => {
		it("topLeft → top", () => {
			expect(getAnchorYSnapEdge("topLeft", 1)).toBe("top");
		});
		it("topRight → top", () => {
			expect(getAnchorYSnapEdge("topRight", 1)).toBe("top");
		});
		it("topCenter → top", () => {
			expect(getAnchorYSnapEdge("topCenter", 1)).toBe("top");
		});
		it("bottomLeft → bottom", () => {
			expect(getAnchorYSnapEdge("bottomLeft", 1)).toBe("bottom");
		});
		it("bottomRight → bottom", () => {
			expect(getAnchorYSnapEdge("bottomRight", 1)).toBe("bottom");
		});
		it("bottomCenter → bottom", () => {
			expect(getAnchorYSnapEdge("bottomCenter", 1)).toBe("bottom");
		});
		it("rightCenter → null（上下端でない）", () => {
			expect(getAnchorYSnapEdge("rightCenter", 1)).toBeNull();
		});
		it("leftCenter → null", () => {
			expect(getAnchorYSnapEdge("leftCenter", 1)).toBeNull();
		});
	});

	describe("スケール負（垂直反転）", () => {
		it("topLeft → bottom（反転）", () => {
			expect(getAnchorYSnapEdge("topLeft", -1)).toBe("bottom");
		});
		it("bottomRight → top（反転）", () => {
			expect(getAnchorYSnapEdge("bottomRight", -1)).toBe("top");
		});
	});
});

// ─── calcSnapCursorDelta ───────────────────────────────────────────────────

/** 単位ヤコビアン（各辺でカーソル移動がそのままエッジ移動に対応） */
const unitJ = {
	left: { dx: 1, dy: 0 },
	right: { dx: 1, dy: 0 },
	top: { dx: 0, dy: 1 },
	bottom: { dx: 0, dy: 1 },
};

describe("calcSnapCursorDelta", () => {
	it("xEdge も yEdge も null → { dx:0, dy:0 }", () => {
		expect(calcSnapCursorDelta(unitJ, null, null, 5, 5)).toEqual({
			dx: 0,
			dy: 0,
		});
	});

	it("snapAabbDx=0 かつ snapAabbDy=0 → { dx:0, dy:0 }", () => {
		expect(calcSnapCursorDelta(unitJ, "left", "top", 0, 0)).toEqual({
			dx: 0,
			dy: 0,
		});
	});

	it("xEdge のみ → X軸成分のみ解く", () => {
		// J[right].dx=1 → dx = snapAabbDx / 1 = 10
		expect(calcSnapCursorDelta(unitJ, "right", null, 10, 0)).toEqual({
			dx: 10,
			dy: 0,
		});
	});

	it("yEdge のみ → Y軸成分のみ解く", () => {
		// J[top].dy=1 → dy = snapAabbDy / 1 = 7
		expect(calcSnapCursorDelta(unitJ, null, "top", 0, 7)).toEqual({
			dx: 0,
			dy: 7,
		});
	});

	it("両辺あり・行列式が十分大きい → 2x2 線形系を解く", () => {
		// unitJ で: left: dx=1,dy=0; top: dx=0,dy=1
		// det = 1*1 - 0*0 = 1 > 0.09
		// dx = (snapDx * d - snapDy * b) / det = (3 * 1 - 4 * 0) / 1 = 3
		// dy = (snapDy * a - snapDx * c) / det = (4 * 1 - 3 * 0) / 1 = 4
		expect(calcSnapCursorDelta(unitJ, "left", "top", 3, 4)).toEqual({
			dx: 3,
			dy: 4,
		});
	});

	it("行列式が小さい（感度の低い系）→ 感度の高い辺のみで解く", () => {
		// xEdge=left, yEdge=top をともに {dx:1,dy:0} にして行列式を 0 にする
		// det = (1)(0) - (0)(1) = 0 → |det| < 0.09
		// xSens = max(|1|, |0|) = 1, ySens = max(|1|, |0|) = 1
		// xSens >= ySens → xEdge 優先
		// solveEdgeCursorDelta(J[left], 5) → |dx|>=|dy| → dx=5/1=5, dy=0
		const J = {
			left: { dx: 1, dy: 0 },
			right: { dx: 1, dy: 0 },
			top: { dx: 1, dy: 0 }, // 縮退させるため left と同じ方向
			bottom: { dx: 0, dy: 1 },
		};
		const result = calcSnapCursorDelta(J, "left", "top", 5, 3);
		expect(result).toEqual({ dx: 5, dy: 0 });
	});

	describe("anchorType を使った実用的なケース（TypeScript 型確認）", () => {
		const anchor: TransformAnchorType = "topRight";
		it("topRight anchor は XY 両辺を持つ", () => {
			expect(getAnchorXSnapEdge(anchor, 1)).toBe("right");
			expect(getAnchorYSnapEdge(anchor, 1)).toBe("top");
		});
	});
});
