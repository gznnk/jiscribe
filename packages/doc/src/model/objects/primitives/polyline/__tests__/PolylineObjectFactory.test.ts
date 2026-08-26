import { describe, expect, it } from "vitest";

import { POLYLINE_DOC_DEFAULTS } from "../PolylineDoc";
import { PolylineObjectFactory } from "../PolylineObjectFactory";

type Pt = { x: number; y: number };

describe("PolylineObjectFactory", () => {
	describe("createDoc", () => {
		it("creates a symmetric horizontal 2-point line centered on the position", () => {
			const doc = PolylineObjectFactory.createDoc({ x: 100, y: 50 }) as Record<
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

		// The definition advertises POLYLINE_DOC_DEFAULTS to the schema and AI docs,
		// so creation has to be the thing they describe.
		it("carries every field of the registered creation defaults", () => {
			const doc = PolylineObjectFactory.createDoc({ x: 100, y: 50 });

			expect(doc).toMatchObject(
				POLYLINE_DOC_DEFAULTS as Record<string, unknown>,
			);
		});

		it("can replace stroke via overrides", () => {
			const doc = PolylineObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ stroke: "#00ff00" },
			) as Record<string, unknown>;

			expect(doc.stroke).toBe("#00ff00");
		});

		it("cannot override id and points via overrides (factory-managed)", () => {
			const doc = PolylineObjectFactory.createDoc(
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
			expect(PolylineObjectFactory.calcDimensions()).toEqual({
				halfWidth: 80,
				halfHeight: 0,
			});
		});
	});

	describe("createDocFromBounds", () => {
		it("creates a segment using the 2 points directly as endpoints", () => {
			const doc = PolylineObjectFactory.createDocFromBounds?.(
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
			expect(
				PolylineObjectFactory.createDocFromBounds?.(0, 0, 3, 0),
			).toBeNull();
		});
	});
});

describe("PolylineObjectFactory nested override aliasing", () => {
	// Overrides come from module-level stencil presets, so a nested value must be
	// copied into each created doc, never shared (same rule as createFrameObjectFactory).
	it("copies nested overrides instead of sharing the caller's object", () => {
		const stencilOverrides = { meta: { name: "preset" } };
		const first = PolylineObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;
		const second = PolylineObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;

		(first.meta as { name: string }).name = "edited";

		expect((second.meta as { name: string }).name).toBe("preset");
		expect(stencilOverrides.meta.name).toBe("preset");
	});
});
