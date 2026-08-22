import { describe, expect, it } from "vitest";

import { RECT_DOC_DEFAULTS } from "../RectDoc";
import { RectObjectFactory } from "../RectObjectFactory";

describe("RectObjectFactory", () => {
	describe("createDoc", () => {
		it("creates a default-sized rect centered on the position", () => {
			const doc = RectObjectFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("rect");
			expect(doc.id).toEqual(expect.any(String));
			// Default 100x100 centered → top-left is (50, 50)
			expect(doc.x).toBe(50);
			expect(doc.y).toBe(50);
			expect(doc.width).toBe(RECT_DOC_DEFAULTS.width);
			expect(doc.height).toBe(RECT_DOC_DEFAULTS.height);
		});

		it("applies overridden width/height in the centering calculation", () => {
			const doc = RectObjectFactory.createDoc(
				{ x: 100, y: 100 },
				{ width: 40, height: 20 },
			) as Record<string, unknown>;

			expect(doc.width).toBe(40);
			expect(doc.height).toBe(20);
			expect(doc.x).toBe(80); // 100 - 40 / 2
			expect(doc.y).toBe(90); // 100 - 20 / 2
		});

		it("assigns a different id on each creation", () => {
			const a = RectObjectFactory.createDoc({ x: 0, y: 0 });
			const b = RectObjectFactory.createDoc({ x: 0, y: 0 });
			expect(a.id).not.toBe(b.id);
		});
	});

	describe("calcDimensions", () => {
		it("returns the default half-size", () => {
			expect(RectObjectFactory.calcDimensions()).toEqual({
				halfWidth: RECT_DOC_DEFAULTS.width / 2,
				halfHeight: RECT_DOC_DEFAULTS.height / 2,
			});
		});

		it("returns the half-size reflecting overrides", () => {
			expect(
				RectObjectFactory.calcDimensions({ width: 40, height: 20 }),
			).toEqual({ halfWidth: 20, halfHeight: 10 });
		});
	});

	describe("createDocFromBounds", () => {
		it("creates a normalized top-left origin and size from 2 points", () => {
			const doc = RectObjectFactory.createDocFromBounds?.(
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

		it("returns null when below the minimum size", () => {
			expect(RectObjectFactory.createDocFromBounds?.(0, 0, 3, 3)).toBeNull();
		});
	});
});
