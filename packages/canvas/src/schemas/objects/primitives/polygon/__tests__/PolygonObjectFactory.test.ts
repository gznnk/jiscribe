import { describe, expect, it } from "vitest";

import { PolygonObjectFactory } from "../PolygonObjectFactory";

type Pt = { x: number; y: number };

describe("PolygonObjectFactory", () => {
	describe("createDoc", () => {
		it("creates a regular 5-vertex polygon around the center with the first vertex straight up", () => {
			const doc = PolygonObjectFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;
			const points = doc.points as Pt[];

			expect(doc.type).toBe("polygon");
			expect(doc.id).toEqual(expect.any(String));
			expect(points).toHaveLength(5);
			// The first vertex is at -90° (straight up) → x is the center, y is center - radius(60)
			expect(points[0].x).toBe(100);
			expect(points[0].y).toBe(40);
		});

		it("can replace fill/stroke via overrides", () => {
			const doc = PolygonObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ fill: "#ff0000" },
			) as Record<string, unknown>;

			expect(doc.fill).toBe("#ff0000");
		});

		it("cannot override id and points via overrides (factory-managed)", () => {
			const doc = PolygonObjectFactory.createDoc(
				{ x: 100, y: 100 },
				{ id: "forced-id", points: [{ x: 0, y: 0 }] },
			) as Record<string, unknown>;

			expect(doc.id).not.toBe("forced-id");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.points).toHaveLength(5);
		});
	});

	describe("calcDimensions", () => {
		it("returns the default circumradius as the half-size", () => {
			expect(PolygonObjectFactory.calcDimensions()).toEqual({
				halfWidth: 60,
				halfHeight: 60,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("creates 5 vertices fitting the bounds' center and half-size", () => {
			const doc = PolygonObjectFactory.createDocFromBounds?.(
				0,
				0,
				100,
				200,
			) as Record<string, unknown>;
			const points = doc.points as Pt[];

			expect(points).toHaveLength(5);
			// Center (50,100), vertical radius 100 → the first vertex is straight up
			expect(points[0].x).toBe(50);
			expect(points[0].y).toBe(0);
		});

		it("returns null when below the minimum size", () => {
			expect(PolygonObjectFactory.createDocFromBounds?.(0, 0, 3, 3)).toBeNull();
		});
	});
});

describe("PolygonObjectFactory nested override aliasing", () => {
	// Overrides come from module-level stencil presets, so a nested value must be
	// copied into each created doc, never shared (same rule as createFrameObjectFactory).
	it("copies nested overrides instead of sharing the caller's object", () => {
		const stencilOverrides = { meta: { name: "preset" } };
		const first = PolygonObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;
		const second = PolygonObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;

		(first.meta as { name: string }).name = "edited";

		expect((second.meta as { name: string }).name).toBe("preset");
		expect(stencilOverrides.meta.name).toBe("preset");
	});
});
