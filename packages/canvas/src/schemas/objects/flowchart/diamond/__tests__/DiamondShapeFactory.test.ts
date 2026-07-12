import { describe, expect, it } from "vitest";

import { DIAMOND_DOC_DEFAULTS } from "../DiamondDoc";
import { DiamondShapeFactory } from "../DiamondShapeFactory";

describe("DiamondShapeFactory", () => {
	describe("createDoc", () => {
		it("creates a default-sized diamond centered on the position", () => {
			const doc = DiamondShapeFactory.createDoc({ x: 100, y: 80 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("diamond");
			expect(doc.id).toEqual(expect.any(String));
			// The top-left coordinate is the center minus half the size
			expect(doc.x).toBe(100 - DIAMOND_DOC_DEFAULTS.width / 2);
			expect(doc.y).toBe(80 - DIAMOND_DOC_DEFAULTS.height / 2);
			expect(doc.width).toBe(DIAMOND_DOC_DEFAULTS.width);
			expect(doc.height).toBe(DIAMOND_DOC_DEFAULTS.height);
		});

		it("can replace the size via overrides", () => {
			const doc = DiamondShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ width: 40, height: 20 },
			) as Record<string, unknown>;

			expect(doc.width).toBe(40);
			expect(doc.height).toBe(20);
			expect(doc.x).toBe(-20);
			expect(doc.y).toBe(-10);
		});
	});

	describe("calcDimensions", () => {
		it("returns half the size as the half-size", () => {
			expect(DiamondShapeFactory.calcDimensions()).toEqual({
				halfWidth: DIAMOND_DOC_DEFAULTS.width / 2,
				halfHeight: DIAMOND_DOC_DEFAULTS.height / 2,
			});
		});

		it("applies overridden width/height", () => {
			expect(
				DiamondShapeFactory.calcDimensions({ width: 24, height: 16 }),
			).toEqual({
				halfWidth: 12,
				halfHeight: 8,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("computes the top-left coordinate and size from 2 points", () => {
			const doc = DiamondShapeFactory.createDocFromBounds?.(
				10,
				20,
				50,
				60,
			) as Record<string, unknown>;

			expect(doc.x).toBe(10);
			expect(doc.y).toBe(20);
			expect(doc.width).toBe(40);
			expect(doc.height).toBe(40);
		});

		it("returns null when below the minimum size", () => {
			expect(DiamondShapeFactory.createDocFromBounds?.(0, 0, 2, 2)).toBeNull();
		});
	});
});
