import { describe, expect, it } from "vitest";

import { DIAMOND_DOC_DEFAULTS } from "../DiamondDoc";
import { DiamondShapeFactory } from "../DiamondShapeFactory";

describe("DiamondShapeFactory", () => {
	describe("createDoc", () => {
		it("position を中心に既定サイズの diamond を生成する", () => {
			const doc = DiamondShapeFactory.createDoc({ x: 100, y: 80 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("diamond");
			expect(doc.id).toEqual(expect.any(String));
			// 左上座標は中心からサイズの半分を引いた位置
			expect(doc.x).toBe(100 - DIAMOND_DOC_DEFAULTS.width / 2);
			expect(doc.y).toBe(80 - DIAMOND_DOC_DEFAULTS.height / 2);
			expect(doc.width).toBe(DIAMOND_DOC_DEFAULTS.width);
			expect(doc.height).toBe(DIAMOND_DOC_DEFAULTS.height);
		});

		it("overrides でサイズを差し替えられる", () => {
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
		it("サイズの半分を半サイズとして返す", () => {
			expect(DiamondShapeFactory.calcDimensions()).toEqual({
				halfWidth: DIAMOND_DOC_DEFAULTS.width / 2,
				halfHeight: DIAMOND_DOC_DEFAULTS.height / 2,
			});
		});

		it("overrides の width/height を反映する", () => {
			expect(
				DiamondShapeFactory.calcDimensions({ width: 24, height: 16 }),
			).toEqual({
				halfWidth: 12,
				halfHeight: 8,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("2 点から左上座標とサイズを算出する", () => {
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

		it("最小サイズ未満なら null を返す", () => {
			expect(DiamondShapeFactory.createDocFromBounds?.(0, 0, 2, 2)).toBeNull();
		});
	});
});
