import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectRegistry } from "../../../../controllers/setup/initializeObjectRegistry";
import { createObjectDoc } from "../createObjectDoc";

// createObjectDoc resolves via shapeFactoryRegistry, so initialize the registry
beforeAll(() => {
	initializeObjectRegistry();
});

const pos = { x: 100, y: 200 };

describe("createObjectDoc", () => {
	it("the generated Doc has an id (UUID)", () => {
		const doc = createObjectDoc("rect", pos);
		expect(doc.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	describe("rect", () => {
		it("sets x, y centered on the position", () => {
			const doc = createObjectDoc("rect", pos);
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
			expect(createObjectDoc("rect", pos).type).toBe("rect");
		});

		it("width/height can be overridden via overrides", () => {
			const doc = createObjectDoc("rect", pos, { width: 50, height: 30 });
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
			const doc = createObjectDoc("ellipse", pos);
			const e = doc as unknown as { cx: number; cy: number };
			expect(e.cx).toBe(pos.x);
			expect(e.cy).toBe(pos.y);
		});

		it("type is 'ellipse'", () => {
			expect(createObjectDoc("ellipse", pos).type).toBe("ellipse");
		});
	});

	describe("sticky", () => {
		it("sets x, y centered on the position", () => {
			const doc = createObjectDoc("sticky", pos);
			const s = doc as unknown as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			expect(s.x).toBeCloseTo(pos.x - s.width / 2);
			expect(s.y).toBeCloseTo(pos.y - s.height / 2);
		});

		it("type is 'sticky'", () => {
			expect(createObjectDoc("sticky", pos).type).toBe("sticky");
		});
	});

	describe("polyline", () => {
		it("has 2 horizontal points centered on the position", () => {
			const doc = createObjectDoc("polyline", pos);
			const pl = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pl.points).toHaveLength(2);
			expect(pl.points[0].y).toBe(pos.y);
			expect(pl.points[1].y).toBe(pos.y);
			// left point < center < right point
			expect(pl.points[0].x).toBeLessThan(pos.x);
			expect(pl.points[1].x).toBeGreaterThan(pos.x);
		});

		it("type is 'polyline'", () => {
			expect(createObjectDoc("polyline", pos).type).toBe("polyline");
		});
	});

	describe("polygon", () => {
		it("has 5 vertices", () => {
			const doc = createObjectDoc("polygon", pos);
			const pg = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pg.points).toHaveLength(5);
		});

		it("type is 'polygon'", () => {
			expect(createObjectDoc("polygon", pos).type).toBe("polygon");
		});

		it("each vertex lies on a circle centered on the position (within tolerance)", () => {
			const RADIUS = 60;
			const doc = createObjectDoc("polygon", pos);
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
				),
			).toThrow();
		});
	});
});
