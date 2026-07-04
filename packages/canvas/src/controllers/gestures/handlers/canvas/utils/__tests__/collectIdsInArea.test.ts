import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { collectIdsInArea } from "../collectIdsInArea";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const connector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [{ x: 0, y: 0 }],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 10, y: 10 } } },
		target: { anchor: { kind: "free", point: { x: 40, y: 40 } } },
	}) as unknown as ObjectState;

describe("collectIdsInArea", () => {
	it("returns [] when there are no objects", () => {
		expect(collectIdsInArea({}, 0, 0, 100, 100)).toEqual([]);
	});

	describe("rectangle (TransformedFrame)", () => {
		it("includes objects fully contained within the area", () => {
			// rect: cx=50, cy=50, w=40, h=40 -> bbox: 30,30 to 70,70
			const r = rect("r", 50, 50, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).toContain("r");
		});

		it("excludes objects that partially overflow (past the right edge)", () => {
			// rect: cx=90, cy=50, w=40, h=40 -> bbox: 70,30 to 110,70
			const r = rect("r", 90, 50, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).not.toContain("r");
		});

		it("excludes objects outside the area", () => {
			// rect: cx=200, cy=200, w=40, h=40 -> outside the area
			const r = rect("r", 200, 200, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).not.toContain("r");
		});

		it("includes when the bbox edge exactly touches the area boundary", () => {
			// rect: cx=50, cy=50, w=100, h=100 -> bbox: 0,0 to 100,100
			const r = rect("r", 50, 50, 100, 100);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).toContain("r");
		});
	});

	describe("Poly (Polyline / Polygon)", () => {
		it("includes a polyline fully within the area", () => {
			const p = poly("p", [
				{ x: 10, y: 10 },
				{ x: 40, y: 40 },
			]);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).toContain("p");
		});

		it("excludes an overflowing polyline", () => {
			const p = poly("p", [
				{ x: 10, y: 10 },
				{ x: 120, y: 40 },
			]);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).not.toContain("p");
		});

		it("excludes a polyline with empty points", () => {
			const p = poly("p", []);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).not.toContain("p");
		});
	});

	describe("Connector", () => {
		it("skips connectors via the type check", () => {
			const c = connector("c");
			const result = collectIdsInArea({ c }, 0, 0, 1000, 1000);
			expect(result).not.toContain("c");
		});
	});

	describe("mixed multiple objects", () => {
		it("returns only the in-area objects when in- and out-of-area are mixed", () => {
			const inside = rect("inside", 50, 50, 40, 40);
			const outside = rect("outside", 200, 200, 40, 40);
			const result = collectIdsInArea({ inside, outside }, 0, 0, 100, 100);
			expect(result).toContain("inside");
			expect(result).not.toContain("outside");
		});
	});
});
