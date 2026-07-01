import { describe, it, expect } from "vitest";

import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calcGroupBoundingBox } from "../calcGroupBoundingBox";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
) =>
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
	}) as unknown;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const poly = (id: string, points: Array<{ x: number; y: number }>) =>
	({ id, type: "polyline", points }) as unknown;

describe("calcGroupBoundingBox", () => {
	it("returns null when childIds is empty", () => {
		const g = group("g", []);
		expect(calcGroupBoundingBox(g, {})).toBeNull();
	});

	it("returns null when only nonexistent childIds are present", () => {
		const g = group("g", ["missing"]);
		expect(calcGroupBoundingBox(g, {})).toBeNull();
	});

	describe("single rectangle child", () => {
		it("correctly computes the bounding box of a rect with rotation=0", () => {
			const child = rect("r", 100, 100, 100, 50);
			const g = group("g", ["r"]);
			const result = calcGroupBoundingBox(g, { r: child });
			expect(result).toEqual({ left: 50, top: 75, right: 150, bottom: 125 });
		});
	});

	describe("multiple rectangle children", () => {
		it("returns the combined bounding box of two rects", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const g = group("g", ["r1", "r2"]);
			const result = calcGroupBoundingBox(g, { r1, r2 });
			// r1: left=30, top=30, right=70, bottom=70
			// r2: left=130, top=130, right=170, bottom=170
			expect(result).toEqual({ left: 30, top: 30, right: 170, bottom: 170 });
		});
	});

	describe("nested groups", () => {
		it("recursively processes nested groups and returns the bounding box", () => {
			const child = rect("r", 100, 100, 100, 100);
			const innerGroup = group("inner", ["r"]);
			const outerGroup = group("outer", ["inner"]);
			const objects = { r: child, inner: innerGroup };
			// inner: left=50, top=50, right=150, bottom=150
			const result = calcGroupBoundingBox(outerGroup, objects);
			expect(result).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});

		it("empty nested groups are ignored", () => {
			const child = rect("r", 100, 100, 100, 100);
			const emptyInner = group("empty", []);
			const outerGroup = group("outer", ["empty", "r"]);
			const objects = { r: child, empty: emptyInner };
			const result = calcGroupBoundingBox(outerGroup, objects);
			expect(result).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});
	});

	describe("Poly children", () => {
		it("computes the bounding box from a polyline's points", () => {
			const p = poly("pl", [
				{ x: 10, y: 20 },
				{ x: 50, y: 80 },
				{ x: 30, y: 10 },
			]);
			const g = group("g", ["pl"]);
			const result = calcGroupBoundingBox(g, { pl: p });
			expect(result).toEqual({ left: 10, top: 10, right: 50, bottom: 80 });
		});

		it("a polyline with empty points is ignored", () => {
			const emptyPoly = poly("pl", []);
			const g = group("g", ["pl"]);
			expect(calcGroupBoundingBox(g, { pl: emptyPoly })).toBeNull();
		});
	});
});
