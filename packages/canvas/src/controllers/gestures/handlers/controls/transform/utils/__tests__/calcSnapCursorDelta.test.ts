import { describe, it, expect } from "vitest";

import type { TransformAnchorType } from "../../TransformAnchorType";
import {
	calcSnapCursorDelta,
	getAnchorXSnapEdge,
	getAnchorYSnapEdge,
} from "../calcSnapCursorDelta";

// ─── getAnchorXSnapEdge ────────────────────────────────────────────────────

describe("getAnchorXSnapEdge", () => {
	describe("positive scale (no flip)", () => {
		it("topRight -> right", () => {
			expect(getAnchorXSnapEdge("topRight", 1)).toBe("right");
		});
		it("bottomRight -> right", () => {
			expect(getAnchorXSnapEdge("bottomRight", 1)).toBe("right");
		});
		it("rightCenter -> right", () => {
			expect(getAnchorXSnapEdge("rightCenter", 1)).toBe("right");
		});
		it("topLeft -> left", () => {
			expect(getAnchorXSnapEdge("topLeft", 1)).toBe("left");
		});
		it("bottomLeft -> left", () => {
			expect(getAnchorXSnapEdge("bottomLeft", 1)).toBe("left");
		});
		it("leftCenter -> left", () => {
			expect(getAnchorXSnapEdge("leftCenter", 1)).toBe("left");
		});
		it("topCenter -> null (not a left/right edge)", () => {
			expect(getAnchorXSnapEdge("topCenter", 1)).toBeNull();
		});
		it("bottomCenter -> null", () => {
			expect(getAnchorXSnapEdge("bottomCenter", 1)).toBeNull();
		});
	});

	describe("negative scale (horizontal flip)", () => {
		it("topRight -> left (flipped)", () => {
			expect(getAnchorXSnapEdge("topRight", -1)).toBe("left");
		});
		it("topLeft -> right (flipped)", () => {
			expect(getAnchorXSnapEdge("topLeft", -1)).toBe("right");
		});
	});
});

// ─── getAnchorYSnapEdge ────────────────────────────────────────────────────

describe("getAnchorYSnapEdge", () => {
	describe("positive scale (no flip)", () => {
		it("topLeft -> top", () => {
			expect(getAnchorYSnapEdge("topLeft", 1)).toBe("top");
		});
		it("topRight -> top", () => {
			expect(getAnchorYSnapEdge("topRight", 1)).toBe("top");
		});
		it("topCenter -> top", () => {
			expect(getAnchorYSnapEdge("topCenter", 1)).toBe("top");
		});
		it("bottomLeft -> bottom", () => {
			expect(getAnchorYSnapEdge("bottomLeft", 1)).toBe("bottom");
		});
		it("bottomRight -> bottom", () => {
			expect(getAnchorYSnapEdge("bottomRight", 1)).toBe("bottom");
		});
		it("bottomCenter -> bottom", () => {
			expect(getAnchorYSnapEdge("bottomCenter", 1)).toBe("bottom");
		});
		it("rightCenter -> null (not a top/bottom edge)", () => {
			expect(getAnchorYSnapEdge("rightCenter", 1)).toBeNull();
		});
		it("leftCenter -> null", () => {
			expect(getAnchorYSnapEdge("leftCenter", 1)).toBeNull();
		});
	});

	describe("negative scale (vertical flip)", () => {
		it("topLeft -> bottom (flipped)", () => {
			expect(getAnchorYSnapEdge("topLeft", -1)).toBe("bottom");
		});
		it("bottomRight -> top (flipped)", () => {
			expect(getAnchorYSnapEdge("bottomRight", -1)).toBe("top");
		});
	});
});

// ─── calcSnapCursorDelta ───────────────────────────────────────────────────

/** Unit Jacobian (for each edge, cursor movement maps directly to edge movement) */
const unitJ = {
	left: { dx: 1, dy: 0 },
	right: { dx: 1, dy: 0 },
	top: { dx: 0, dy: 1 },
	bottom: { dx: 0, dy: 1 },
};

describe("calcSnapCursorDelta", () => {
	it("both xEdge and yEdge null -> { dx:0, dy:0 }", () => {
		expect(calcSnapCursorDelta(unitJ, null, null, 5, 5)).toEqual({
			dx: 0,
			dy: 0,
		});
	});

	it("snapAabbDx=0 and snapAabbDy=0 -> { dx:0, dy:0 }", () => {
		expect(calcSnapCursorDelta(unitJ, "left", "top", 0, 0)).toEqual({
			dx: 0,
			dy: 0,
		});
	});

	it("xEdge only -> solves only the X-axis component", () => {
		// J[right].dx=1 -> dx = snapAabbDx / 1 = 10
		expect(calcSnapCursorDelta(unitJ, "right", null, 10, 0)).toEqual({
			dx: 10,
			dy: 0,
		});
	});

	it("yEdge only -> solves only the Y-axis component", () => {
		// J[top].dy=1 -> dy = snapAabbDy / 1 = 7
		expect(calcSnapCursorDelta(unitJ, null, "top", 0, 7)).toEqual({
			dx: 0,
			dy: 7,
		});
	});

	it("both edges present and determinant large enough -> solves the 2x2 linear system", () => {
		// In unitJ: left: dx=1,dy=0; top: dx=0,dy=1
		// det = 1*1 - 0*0 = 1 > 0.09
		// dx = (snapDx * d - snapDy * b) / det = (3 * 1 - 4 * 0) / 1 = 3
		// dy = (snapDy * a - snapDx * c) / det = (4 * 1 - 3 * 0) / 1 = 4
		expect(calcSnapCursorDelta(unitJ, "left", "top", 3, 4)).toEqual({
			dx: 3,
			dy: 4,
		});
	});

	it("small determinant (low-sensitivity system) -> solves using only the more sensitive edge", () => {
		// Make xEdge=left and yEdge=top both {dx:1,dy:0} so the determinant is 0
		// det = (1)(0) - (0)(1) = 0 -> |det| < 0.09
		// xSens = max(|1|, |0|) = 1, ySens = max(|1|, |0|) = 1
		// xSens >= ySens -> prefer xEdge
		// solveEdgeCursorDelta(J[left], 5) -> |dx|>=|dy| -> dx=5/1=5, dy=0
		const J = {
			left: { dx: 1, dy: 0 },
			right: { dx: 1, dy: 0 },
			top: { dx: 1, dy: 0 }, // same direction as left to make it degenerate
			bottom: { dx: 0, dy: 1 },
		};
		const result = calcSnapCursorDelta(J, "left", "top", 5, 3);
		expect(result).toEqual({ dx: 5, dy: 0 });
	});

	describe("practical case using anchorType (TypeScript type check)", () => {
		const anchor: TransformAnchorType = "topRight";
		it("topRight anchor has both X and Y edges", () => {
			expect(getAnchorXSnapEdge(anchor, 1)).toBe("right");
			expect(getAnchorYSnapEdge(anchor, 1)).toBe("top");
		});
	});
});
