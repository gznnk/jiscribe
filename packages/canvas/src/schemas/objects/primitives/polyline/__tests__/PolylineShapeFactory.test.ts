import { describe, expect, it } from "vitest";

import { PolylineShapeFactory } from "../PolylineShapeFactory";

type Pt = { x: number; y: number };

describe("PolylineShapeFactory", () => {
	describe("createDoc", () => {
		it("creates a symmetric horizontal 2-point line centered on the position", () => {
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

		it("can replace stroke via overrides", () => {
			const doc = PolylineShapeFactory.createDoc(
				{ x: 0, y: 0 },
				{ stroke: "#00ff00" },
			) as Record<string, unknown>;

			expect(doc.stroke).toBe("#00ff00");
		});

		it("cannot override id and points via overrides (factory-managed)", () => {
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
		it("returns halfHeight 0 since it is a horizontal line", () => {
			expect(PolylineShapeFactory.calcDimensions()).toEqual({
				halfWidth: 80,
				halfHeight: 0,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("creates a segment using the 2 points directly as endpoints", () => {
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

		it("returns null when the distance between the 2 points is below the minimum size", () => {
			// distance √(3²+0²)=3 < 5
			expect(PolylineShapeFactory.createDocFromBounds?.(0, 0, 3, 0)).toBeNull();
		});
	});
});
