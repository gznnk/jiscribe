import { describe, expect, it } from "vitest";

import { RECT_DOC_DEFAULTS } from "../RectDoc";
import { RectShapeFactory } from "../RectShapeFactory";

describe("RectShapeFactory", () => {
	describe("createDoc", () => {
		it("position を中央に既定サイズの rect を生成する", () => {
			const doc = RectShapeFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("rect");
			expect(doc.id).toEqual(expect.any(String));
			// 既定 100x100 を中央寄せ → 左上は (50, 50)
			expect(doc.x).toBe(50);
			expect(doc.y).toBe(50);
			expect(doc.width).toBe(RECT_DOC_DEFAULTS.width);
			expect(doc.height).toBe(RECT_DOC_DEFAULTS.height);
		});

		it("overrides の width/height を中央寄せの計算に反映する", () => {
			const doc = RectShapeFactory.createDoc(
				{ x: 100, y: 100 },
				{ width: 40, height: 20 },
			) as Record<string, unknown>;

			expect(doc.width).toBe(40);
			expect(doc.height).toBe(20);
			expect(doc.x).toBe(80); // 100 - 40 / 2
			expect(doc.y).toBe(90); // 100 - 20 / 2
		});

		it("生成ごとに異なる id を振る", () => {
			const a = RectShapeFactory.createDoc({ x: 0, y: 0 });
			const b = RectShapeFactory.createDoc({ x: 0, y: 0 });
			expect(a.id).not.toBe(b.id);
		});
	});

	describe("calcDimensions", () => {
		it("既定の半サイズを返す", () => {
			expect(RectShapeFactory.calcDimensions()).toEqual({
				halfWidth: RECT_DOC_DEFAULTS.width / 2,
				halfHeight: RECT_DOC_DEFAULTS.height / 2,
			});
		});

		it("overrides を反映した半サイズを返す", () => {
			expect(
				RectShapeFactory.calcDimensions({ width: 40, height: 20 }),
			).toEqual({ halfWidth: 20, halfHeight: 10 });
		});
	});

	describe("createDocFromBounds", () => {
		it("2 点から正規化した左上原点とサイズを生成する", () => {
			const doc = RectShapeFactory.createDocFromBounds?.(
				30,
				40,
				10,
				10,
			) as Record<string, unknown>;

			expect(doc.x).toBe(10); // min(30, 10)
			expect(doc.y).toBe(10); // min(40, 10)
			expect(doc.width).toBe(20);
			expect(doc.height).toBe(30);
		});

		it("最小サイズ未満なら null を返す", () => {
			expect(RectShapeFactory.createDocFromBounds?.(0, 0, 3, 3)).toBeNull();
		});
	});
});
