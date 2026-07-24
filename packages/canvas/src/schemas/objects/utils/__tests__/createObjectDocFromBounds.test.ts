import { describe, it, expect } from "vitest";

import { createTestRegistries } from "../../../../controllers/setup/createCanvasRegistries";
import { createObjectDocFromBounds } from "../createObjectDocFromBounds";

const registries = createTestRegistries();

describe("createObjectDocFromBounds", () => {
	describe("polyline", () => {
		it("distance below minSize → null", () => {
			// (0,0)→(2,2): dist ≈ 2.83 < 5(minSize)
			expect(
				createObjectDocFromBounds(
					"polyline",
					0,
					0,
					2,
					2,
					registries.objectFactory,
				),
			).toBeNull();
		});

		it("distance exactly minSize (= 5) → not null (strict dist < minSize check)", () => {
			// (0,0)→(3,4): dist = 5 → 5 < 5 = false → not null
			const doc = createObjectDocFromBounds(
				"polyline",
				0,
				0,
				3,
				4,
				registries.objectFactory,
			);
			expect(doc).not.toBeNull();
		});

		it("distance greater than minSize → returns a polyline Doc", () => {
			const doc = createObjectDocFromBounds(
				"polyline",
				0,
				0,
				10,
				0,
				registries.objectFactory,
			);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("polyline");
			expect((doc as unknown as { points: unknown }).points).toEqual([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
		});

		it("applies overrides", () => {
			const doc = createObjectDocFromBounds(
				"polyline",
				0,
				0,
				10,
				0,
				registries.objectFactory,
				{
					stroke: "#ff0000",
				},
			);
			expect((doc as { stroke?: string })?.stroke).toBe("#ff0000");
		});

		it("id is in the UUID format returned by crypto.randomUUID()", () => {
			const doc = createObjectDocFromBounds(
				"polyline",
				0,
				0,
				10,
				0,
				registries.objectFactory,
			);
			expect(doc?.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
		});
	});

	describe("rect", () => {
		it("width below minSize → null", () => {
			expect(
				createObjectDocFromBounds(
					"rect",
					0,
					0,
					3,
					100,
					registries.objectFactory,
				),
			).toBeNull();
		});

		it("height below minSize → null", () => {
			expect(
				createObjectDocFromBounds(
					"rect",
					0,
					0,
					100,
					3,
					registries.objectFactory,
				),
			).toBeNull();
		});

		it("valid size → returns a rect Doc", () => {
			const doc = createObjectDocFromBounds(
				"rect",
				10,
				20,
				60,
				80,
				registries.objectFactory,
			);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("rect");
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.x).toBe(10);
			expect(r.y).toBe(20);
			expect(r.width).toBe(50);
			expect(r.height).toBe(60);
		});

		it("sets x correctly using min even when x1 > x2", () => {
			const doc = createObjectDocFromBounds(
				"rect",
				60,
				80,
				10,
				20,
				registries.objectFactory,
			);
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.x).toBe(10);
			expect(r.y).toBe(20);
			expect(r.width).toBe(50);
			expect(r.height).toBe(60);
		});

		it("overrides take precedence over RECT_DOC_DEFAULTS", () => {
			const doc = createObjectDocFromBounds(
				"rect",
				0,
				0,
				100,
				100,
				registries.objectFactory,
				{
					fill: "blue",
				},
			);
			expect((doc as { fill?: string })?.fill).toBe("blue");
		});

		it("a custom minSize can be specified", () => {
			// minSize=20 → width=15 < 20 → null
			expect(
				createObjectDocFromBounds(
					"rect",
					0,
					0,
					15,
					100,
					registries.objectFactory,
					{},
					20,
				),
			).toBeNull();
		});
	});

	describe("ellipse", () => {
		it("valid size → returns an ellipse Doc", () => {
			const doc = createObjectDocFromBounds(
				"ellipse",
				0,
				0,
				40,
				20,
				registries.objectFactory,
			);
			expect(doc).not.toBeNull();
			expect(doc?.type).toBe("ellipse");
			const e = doc as unknown as {
				cx: number;
				cy: number;
				rx: number;
				ry: number;
			};
			expect(e.cx).toBe(20);
			expect(e.cy).toBe(10);
			expect(e.rx).toBe(20);
			expect(e.ry).toBe(10);
		});
	});
});
