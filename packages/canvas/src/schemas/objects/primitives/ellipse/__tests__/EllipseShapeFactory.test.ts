import { describe, expect, it } from "vitest";

import { ELLIPSE_DOC_DEFAULTS } from "../EllipseDoc";
import { EllipseShapeFactory } from "../EllipseShapeFactory";

describe("EllipseShapeFactory", () => {
	describe("createDoc", () => {
		it("position を中心に既定半径の ellipse を生成する", () => {
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

		it("overrides で半径を差し替えられる", () => {
			const doc = EllipseShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ rx: 10, ry: 5 },
			) as Record<string, unknown>;

			expect(doc.rx).toBe(10);
			expect(doc.ry).toBe(5);
		});
	});

	describe("calcDimensions", () => {
		it("半径をそのまま半サイズとして返す", () => {
			expect(EllipseShapeFactory.calcDimensions()).toEqual({
				halfWidth: ELLIPSE_DOC_DEFAULTS.rx,
				halfHeight: ELLIPSE_DOC_DEFAULTS.ry,
			});
		});

		it("overrides の rx/ry を反映する", () => {
			expect(EllipseShapeFactory.calcDimensions({ rx: 12, ry: 8 })).toEqual({
				halfWidth: 12,
				halfHeight: 8,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("2 点の中心と半径を算出する", () => {
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

		it("最小サイズ未満なら null を返す", () => {
			expect(EllipseShapeFactory.createDocFromBounds?.(0, 0, 2, 2)).toBeNull();
		});
	});
});
