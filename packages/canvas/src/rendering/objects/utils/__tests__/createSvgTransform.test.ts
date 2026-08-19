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
	describe("no rotation (rotation=0)", () => {
		it("identity transform: matrix(1, 0, 0, 1, 0, 0)", () => {
			expect(createSvgTransform(1, 1, 0, 0, 0)).toBe(
				"matrix(1, 0, 0, 1, 0, 0)",
			);
		});

		it("scale only: sx=2, sy=3", () => {
			expect(createSvgTransform(2, 3, 0, 0, 0)).toBe(
				"matrix(2, 0, 0, 3, 0, 0)",
			);
		});

		it("translation only: tx=100, ty=200", () => {
			expect(createSvgTransform(1, 1, 0, 100, 200)).toBe(
				"matrix(1, 0, 0, 1, 100, 200)",
			);
		});

		it("scale + translation", () => {
			expect(createSvgTransform(2, 3, 0, 10, 20)).toBe(
				"matrix(2, 0, 0, 3, 10, 20)",
			);
		});
	});

	describe("with rotation", () => {
		it("90-degree rotation: a≈0, b≈1, c≈-1, d≈0", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 90, 0, 0));
			expect(a).toBeCloseTo(0, 10);
			expect(b).toBeCloseTo(1, 10);
			expect(c).toBeCloseTo(-1, 10);
			expect(d).toBeCloseTo(0, 10);
		});

		it("180-degree rotation: a≈-1, b≈0, c≈0, d≈-1", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 180, 0, 0));
			expect(a).toBeCloseTo(-1, 10);
			expect(b).toBeCloseTo(0, 10);
			expect(c).toBeCloseTo(0, 10);
			expect(d).toBeCloseTo(-1, 10);
		});

		it("360-degree rotation equals the identity transform", () => {
			const [a, b, c, d] = parseMatrix(createSvgTransform(1, 1, 360, 0, 0));
			expect(a).toBeCloseTo(1, 10);
			expect(b).toBeCloseTo(0, 10);
			expect(c).toBeCloseTo(0, 10);
			expect(d).toBeCloseTo(1, 10);
		});

		it("translation is unaffected by rotation (e, f stay as tx, ty)", () => {
			const components = parseMatrix(createSvgTransform(1, 1, 45, 50, 80));
			expect(components[4]).toBe(50);
			expect(components[5]).toBe(80);
		});
	});

	describe("output format", () => {
		it("starts with 'matrix(' and ends with ')'", () => {
			const result = createSvgTransform(1, 1, 0, 0, 0);
			expect(result).toMatch(/^matrix\(.+\)$/);
		});

		it("contains six comma-separated values", () => {
			const components = parseMatrix(createSvgTransform(1, 1, 0, 0, 0));
			expect(components).toHaveLength(6);
		});
	});
});
