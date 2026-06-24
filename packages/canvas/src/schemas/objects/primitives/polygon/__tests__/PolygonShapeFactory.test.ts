import { describe, expect, it } from "vitest";

import { PolygonShapeFactory } from "../PolygonShapeFactory";

type Pt = { x: number; y: number };

describe("PolygonShapeFactory", () => {
	describe("createDoc", () => {
		it("中心の周りに 5 頂点の正多角形を生成し、先頭頂点を真上に置く", () => {
			const doc = PolygonShapeFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;
			const points = doc.points as Pt[];

			expect(doc.type).toBe("polygon");
			expect(doc.id).toEqual(expect.any(String));
			expect(points).toHaveLength(5);
			// 先頭頂点は -90°（真上）→ x は中心、y は中心 - 半径(60)
			expect(points[0].x).toBe(100);
			expect(points[0].y).toBe(40);
		});

		it("overrides で fill/stroke を差し替えられる", () => {
			const doc = PolygonShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ fill: "#ff0000" },
			) as Record<string, unknown>;

			expect(doc.fill).toBe("#ff0000");
		});

		it("overrides では id と points を上書きできない（factory 管理）", () => {
			const doc = PolygonShapeFactory.createDoc(
				{ x: 100, y: 100 },
				{ id: "forced-id", points: [{ x: 0, y: 0 }] },
			) as Record<string, unknown>;

			expect(doc.id).not.toBe("forced-id");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.points).toHaveLength(5);
		});
	});

	describe("calcDimensions", () => {
		it("既定外接半径を半サイズとして返す", () => {
			expect(PolygonShapeFactory.calcDimensions()).toEqual({
				halfWidth: 60,
				halfHeight: 60,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("bounds の中心・半サイズに収まる 5 頂点を生成する", () => {
			const doc = PolygonShapeFactory.createDocFromBounds?.(
				0,
				0,
				100,
				200,
			) as Record<string, unknown>;
			const points = doc.points as Pt[];

			expect(points).toHaveLength(5);
			// 中心 (50,100)・縦半径 100 → 先頭頂点は真上
			expect(points[0].x).toBe(50);
			expect(points[0].y).toBe(0);
		});

		it("最小サイズ未満なら null を返す", () => {
			expect(PolygonShapeFactory.createDocFromBounds?.(0, 0, 3, 3)).toBeNull();
		});
	});
});
