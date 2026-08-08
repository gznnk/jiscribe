import { describe, it, expect } from "vitest";

import { createTestRegistries } from "../../../../controllers/registries/createCanvasRegistries";
import { createObjectDoc } from "../createObjectDoc";

const registries = createTestRegistries();
const pos = { x: 100, y: 200 };

describe("createObjectDoc", () => {
	it("the generated Doc has an id (UUID)", () => {
		const doc = createObjectDoc("rect", pos, registries.objectFactory);
		expect(doc.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	describe("rect", () => {
		it("sets x, y centered on the position", () => {
			const doc = createObjectDoc("rect", pos, registries.objectFactory);
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.width).toBeGreaterThan(0);
			expect(r.height).toBeGreaterThan(0);
			expect(r.x).toBeCloseTo(pos.x - r.width / 2);
			expect(r.y).toBeCloseTo(pos.y - r.height / 2);
		});

		it("type is 'rect'", () => {
			expect(createObjectDoc("rect", pos, registries.objectFactory).type).toBe(
				"rect",
			);
		});

		it("width/height can be overridden via overrides", () => {
			const doc = createObjectDoc("rect", pos, registries.objectFactory, {
				width: 50,
				height: 30,
			});
			const r = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(r.width).toBe(50);
			expect(r.height).toBe(30);
			expect(r.x).toBeCloseTo(pos.x - 25);
			expect(r.y).toBeCloseTo(pos.y - 15);
		});
	});

	describe("ellipse", () => {
		it("sets the position as cx/cy", () => {
			const doc = createObjectDoc("ellipse", pos, registries.objectFactory);
			const e = doc as unknown as { cx: number; cy: number };
			expect(e.cx).toBe(pos.x);
			expect(e.cy).toBe(pos.y);
		});

		it("type is 'ellipse'", () => {
			expect(
				createObjectDoc("ellipse", pos, registries.objectFactory).type,
			).toBe("ellipse");
		});
	});

	describe("polyline", () => {
		it("has 2 horizontal points centered on the position", () => {
			const doc = createObjectDoc("polyline", pos, registries.objectFactory);
			const pl = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pl.points).toHaveLength(2);
			expect(pl.points[0].y).toBe(pos.y);
			expect(pl.points[1].y).toBe(pos.y);
			// left point < center < right point
			expect(pl.points[0].x).toBeLessThan(pos.x);
			expect(pl.points[1].x).toBeGreaterThan(pos.x);
		});

		it("type is 'polyline'", () => {
			expect(
				createObjectDoc("polyline", pos, registries.objectFactory).type,
			).toBe("polyline");
		});
	});

	describe("polygon", () => {
		it("has 5 vertices", () => {
			const doc = createObjectDoc("polygon", pos, registries.objectFactory);
			const pg = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pg.points).toHaveLength(5);
		});

		it("type is 'polygon'", () => {
			expect(
				createObjectDoc("polygon", pos, registries.objectFactory).type,
			).toBe("polygon");
		});

		it("each vertex lies on a circle centered on the position (within tolerance)", () => {
			const RADIUS = 60;
			const doc = createObjectDoc("polygon", pos, registries.objectFactory);
			const pg = doc as unknown as { points: Array<{ x: number; y: number }> };
			for (const pt of pg.points) {
				const dist = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
				expect(dist).toBeCloseTo(RADIUS, 0);
			}
		});
	});

	describe("unsupported type", () => {
		it("throws an Error for unsupported types such as connector", () => {
			expect(() =>
				createObjectDoc(
					"connector" as Parameters<typeof createObjectDoc>[0],
					pos,
					registries.objectFactory,
				),
			).toThrow();
		});
	});
});

describe("createObjectDoc with docDefaults (theme creation defaults)", () => {
	const docDefaults = { fontFamily: "serif" };

	it("applies the theme fontFamily to text-bearing shapes", () => {
		const doc = createObjectDoc(
			"rect",
			pos,
			registries.objectFactory,
			undefined,
			docDefaults,
		);
		expect((doc as unknown as { fontFamily: string }).fontFamily).toBe("serif");
	});

	it("overrides still win over the theme fontFamily", () => {
		const doc = createObjectDoc(
			"rect",
			pos,
			registries.objectFactory,
			{ fontFamily: "monospace" },
			docDefaults,
		);
		expect((doc as unknown as { fontFamily: string }).fontFamily).toBe(
			"monospace",
		);
	});

	it("does not add fontFamily to shapes that do not support it (polyline)", () => {
		const doc = createObjectDoc(
			"polyline",
			pos,
			registries.objectFactory,
			undefined,
			docDefaults,
		);
		expect("fontFamily" in doc).toBe(false);
	});
});
