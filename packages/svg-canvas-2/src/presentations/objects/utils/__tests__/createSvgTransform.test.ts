import { describe, it, expect } from "vitest";

import { createSvgTransform } from "../createSvgTransform";

function parseMatrix(str: string): number[] {
	const match = str.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`Invalid matrix string: ${str}`);
	}
	return match[1].split(",").map((s) => Number(s.trim()));
}

describe("createSvgTransform", () => {
	describe("回転なし（rotation=0）", () => {
		it("恒等変換: matrix(1, 0, 0, 1, 0, 0)", () => {
			expect(createSvgTransform(1, 1, 0, 0, 0)).toBe(
				"matrix(1, 0, 0, 1, 0, 0)",
			);
		});

		it("スケールのみ: sx=2, sy=3", () => {
			expect(createSvgTransform(2, 3, 0, 0, 0)).toBe(
				"matrix(2, 0, 0, 3, 0, 0)",
			);
		});

		it("平行移動のみ: tx=100, ty=200", () => {
			expect(createSvgTransform(1, 1, 0, 100, 200)).toBe(
				"matrix(1, 0, 0, 1, 100, 200)",
			);
		});

		it("スケール + 平行移動", () => {
			expect(createSvgTransform(2, 3, 0, 10, 20)).toBe(
				"matrix(2, 0, 0, 3, 10, 20)",
			);
		});
	});

	describe("回転あり", () => {
		it("90度回転: a≈0, b≈1, c≈-1, d≈0", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 90, 0, 0));
			expect(a).toBeCloseTo(0, 10);
			expect(b).toBeCloseTo(1, 10);
			expect(c).toBeCloseTo(-1, 10);
			expect(d).toBeCloseTo(0, 10);
		});

		it("180度回転: a≈-1, b≈0, c≈0, d≈-1", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 180, 0, 0));
			expect(a).toBeCloseTo(-1, 10);
			expect(b).toBeCloseTo(0, 10);
			expect(c).toBeCloseTo(0, 10);
			expect(d).toBeCloseTo(-1, 10);
		});

		it("360度回転は恒等変換と等しい", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 360, 0, 0));
			expect(a).toBeCloseTo(1, 10);
			expect(b).toBeCloseTo(0, 10);
			expect(c).toBeCloseTo(0, 10);
			expect(d).toBeCloseTo(1, 10);
		});

		it("平行移動は回転の影響を受けない（e, f は tx, ty そのまま）", () => {
			const components = parseMatrix(createSvgTransform(1, 1, 45, 50, 80));
			expect(components[4]).toBe(50);
			expect(components[5]).toBe(80);
		});
	});

	describe("出力形式", () => {
		it("'matrix(' で始まり ')' で終わる", () => {
			const result = createSvgTransform(1, 1, 0, 0, 0);
			expect(result).toMatch(/^matrix\(.+\)$/);
		});

		it("6つのカンマ区切り値を含む", () => {
			const components = parseMatrix(createSvgTransform(1, 1, 0, 0, 0));
			expect(components).toHaveLength(6);
		});
	});
});
