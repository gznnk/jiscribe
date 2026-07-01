import { describe, expect, it } from "vitest";

import { ELLIPSE_DOC_DEFAULTS } from "../EllipseDoc";
import { EllipseShapeFactory } from "../EllipseShapeFactory";

describe("EllipseShapeFactory", () => {
	describe("createDoc", () => {
		it("creates an ellipse with default radii centered on the position", () => {
			const doc = EllipseShapeFactory.createDoc({ x: 100, y: 80 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("ellipse");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.cx).toBe(100);
			expect(doc.cy).toBe(80);
			expect(doc.rx).toBe(ELLIPSE_DOC_DEFAULTS.rx);
			expect(doc.ry).toBe(ELLIPSE_DOC_DEFAULTS.ry);
		});

		it("can replace the radii via overrides", () => {
			const doc = EllipseShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ rx: 10, ry: 5 },
			) as Record<string, unknown>;

			expect(doc.rx).toBe(10);
			expect(doc.ry).toBe(5);
		});
	});

	describe("calcDimensions", () => {
		it("returns the radii directly as the half-size", () => {
			expect(EllipseShapeFactory.calcDimensions()).toEqual({
				halfWidth: ELLIPSE_DOC_DEFAULTS.rx,
				halfHeight: ELLIPSE_DOC_DEFAULTS.ry,
			});
		});

		it("applies overridden rx/ry", () => {
			expect(EllipseShapeFactory.calcDimensions({ rx: 12, ry: 8 })).toEqual({
				halfWidth: 12,
				halfHeight: 8,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("computes the center and radii from 2 points", () => {
			const doc = EllipseShapeFactory.createDocFromBounds?.(
				0,
				0,
				40,
				20,
			) as Record<string, unknown>;

			expect(doc.cx).toBe(20);
			expect(doc.cy).toBe(10);
			expect(doc.rx).toBe(20);
			expect(doc.ry).toBe(10);
		});

		it("returns null when below the minimum size", () => {
			expect(EllipseShapeFactory.createDocFromBounds?.(0, 0, 2, 2)).toBeNull();
		});
	});
});
