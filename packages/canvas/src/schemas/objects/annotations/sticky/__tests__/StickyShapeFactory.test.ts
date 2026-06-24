import { describe, expect, it } from "vitest";

import { STICKY_DOC_DEFAULTS } from "../StickyDoc";
import { StickyShapeFactory } from "../StickyShapeFactory";

describe("StickyShapeFactory", () => {
	describe("createDoc", () => {
		it("position を中央に既定サイズの sticky を生成する", () => {
			const doc = StickyShapeFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("sticky");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.width).toBe(STICKY_DOC_DEFAULTS.width);
			expect(doc.height).toBe(STICKY_DOC_DEFAULTS.height);
			expect(doc.x).toBe(100 - STICKY_DOC_DEFAULTS.width / 2);
			expect(doc.y).toBe(100 - STICKY_DOC_DEFAULTS.height / 2);
		});

		it("overrides の width/height を中央寄せに反映する", () => {
			const doc = StickyShapeFactory.createDoc(
				{ x: 50, y: 50 },
				{ width: 20, height: 10 },
			) as Record<string, unknown>;

			expect(doc.x).toBe(40); // 50 - 20 / 2
			expect(doc.y).toBe(45); // 50 - 10 / 2
		});
	});

	describe("calcDimensions", () => {
		it("既定の半サイズを返す", () => {
			expect(StickyShapeFactory.calcDimensions()).toEqual({
				halfWidth: STICKY_DOC_DEFAULTS.width / 2,
				halfHeight: STICKY_DOC_DEFAULTS.height / 2,
			});
		});
	});

	it("createDocFromBounds を持たない（クリック中央配置のみ）", () => {
		expect(StickyShapeFactory.createDocFromBounds).toBeUndefined();
	});
});
