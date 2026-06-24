import { describe, expect, it } from "vitest";

import { PolylineShapeFactory } from "../PolylineShapeFactory";

type Pt = { x: number; y: number };

describe("PolylineShapeFactory", () => {
	describe("createDoc", () => {
		it("position を中心に左右対称な水平 2 点線を生成する", () => {
			const doc = PolylineShapeFactory.createDoc({ x: 100, y: 50 }) as Record<
				string,
				unknown
			>;
			const points = doc.points as Pt[];

			expect(doc.type).toBe("polyline");
			expect(doc.id).toEqual(expect.any(String));
			expect(points).toEqual([
				{ x: 20, y: 50 }, // 100 - 80
				{ x: 180, y: 50 }, // 100 + 80
			]);
		});

		it("overrides で stroke を差し替えられる", () => {
			const doc = PolylineShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ stroke: "#00ff00" },
			) as Record<string, unknown>;

			expect(doc.stroke).toBe("#00ff00");
		});

		it("overrides では id と points を上書きできない（factory 管理）", () => {
			const doc = PolylineShapeFactory.createDoc(
				{ x: 100, y: 50 },
				{ id: "forced-id", points: [{ x: 0, y: 0 }] },
			) as Record<string, unknown>;

			expect(doc.id).not.toBe("forced-id");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.points).toHaveLength(2);
		});
	});

	describe("calcDimensions", () => {
		it("水平線なので halfHeight は 0 を返す", () => {
			expect(PolylineShapeFactory.calcDimensions()).toEqual({
				halfWidth: 80,
				halfHeight: 0,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("2 点をそのまま端点とする線分を生成する", () => {
			const doc = PolylineShapeFactory.createDocFromBounds?.(
				10,
				20,
				40,
				60,
			) as Record<string, unknown>;

			expect(doc.points).toEqual([
				{ x: 10, y: 20 },
				{ x: 40, y: 60 },
			]);
		});

		it("2 点間距離が最小サイズ未満なら null を返す", () => {
			// 距離 √(3²+0²)=3 < 5
			expect(PolylineShapeFactory.createDocFromBounds?.(0, 0, 3, 0)).toBeNull();
		});
	});
});
