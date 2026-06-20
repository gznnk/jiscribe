import { describe, it, expect } from "vitest";

import { createObjectDoc } from "../createObjectDoc";

const pos = { x: 100, y: 200 };

describe("createObjectDoc", () => {
	it("生成された Doc は id（UUID）を持つ", () => {
		const doc = createObjectDoc("rect", pos);
		expect(doc.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	describe("rect", () => {
		it("position を中心として x, y が設定される", () => {
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

		it("type は 'rect'", () => {
			expect(createObjectDoc("rect", pos).type).toBe("rect");
		});

		it("overrides で width/height を上書きできる", () => {
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
		it("position が cx/cy に設定される", () => {
			const doc = createObjectDoc("ellipse", pos);
			const e = doc as unknown as { cx: number; cy: number };
			expect(e.cx).toBe(pos.x);
			expect(e.cy).toBe(pos.y);
		});

		it("type は 'ellipse'", () => {
			expect(createObjectDoc("ellipse", pos).type).toBe("ellipse");
		});
	});

	describe("sticky", () => {
		it("position を中心として x, y が設定される", () => {
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

		it("type は 'sticky'", () => {
			expect(createObjectDoc("sticky", pos).type).toBe("sticky");
		});
	});

	describe("polyline", () => {
		it("position を中心とした水平な 2 点を持つ", () => {
			const doc = createObjectDoc("polyline", pos);
			const pl = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pl.points).toHaveLength(2);
			expect(pl.points[0].y).toBe(pos.y);
			expect(pl.points[1].y).toBe(pos.y);
			// 左点 < 中心 < 右点
			expect(pl.points[0].x).toBeLessThan(pos.x);
			expect(pl.points[1].x).toBeGreaterThan(pos.x);
		});

		it("type は 'polyline'", () => {
			expect(createObjectDoc("polyline", pos).type).toBe("polyline");
		});
	});

	describe("polygon", () => {
		it("5 頂点を持つ", () => {
			const doc = createObjectDoc("polygon", pos);
			const pg = doc as unknown as { points: Array<{ x: number; y: number }> };
			expect(pg.points).toHaveLength(5);
		});

		it("type は 'polygon'", () => {
			expect(createObjectDoc("polygon", pos).type).toBe("polygon");
		});

		it("各頂点が position を中心とした円上にある（許容誤差あり）", () => {
			const RADIUS = 60;
			const doc = createObjectDoc("polygon", pos);
			const pg = doc as unknown as { points: Array<{ x: number; y: number }> };
			for (const pt of pg.points) {
				const dist = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
				expect(dist).toBeCloseTo(RADIUS, 0);
			}
		});
	});

	describe("未対応 type", () => {
		it("connector などサポートしていない type → Error をスロー", () => {
			expect(() =>
				createObjectDoc(
					"connector" as Parameters<typeof createObjectDoc>[0],
					pos,
				),
			).toThrow();
		});
	});
});
