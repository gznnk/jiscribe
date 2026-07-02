import {
	calcFrameBoxFeatures,
	type BoxFeatures,
	type Point,
} from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import { routeSelfLoop } from "../selfLoop";
import type { OrthogonalConnectorEndpoint } from "../types";

/** Axis-aligned box centered at (100,100), 100 wide, 60 tall (left50 right150 top70 bottom130). */
const box: BoxFeatures = calcFrameBoxFeatures({
	cx: 100,
	cy: 100,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

// edge-center connectPoint endpoints (point and outward direction assumed already resolved by the caller).
const endpoints: Record<string, OrthogonalConnectorEndpoint> = {
	right: { point: { x: 150, y: 100 }, direction: "right", box },
	bottom: { point: { x: 100, y: 130 }, direction: "down", box },
	left: { point: { x: 50, y: 100 }, direction: "left", box },
	top: { point: { x: 100, y: 70 }, direction: "up", box },
};

const allSegmentsOrthogonal = (points: Point[]): boolean =>
	points.every((p, i) =>
		i === 0 ? true : p.x === points[i - 1].x || p.y === points[i - 1].y,
	);

/** True if any point lies strictly inside the box (edges excluded). The loop is expected not to pass through the shape. */
const anyPointStrictlyInsideBox = (points: Point[]): boolean =>
	points.some(
		(p) =>
			p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom,
	);

describe("routeSelfLoop", () => {
	it("adjacent edges (right → bottom) include the endpoints and all segments are orthogonal", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.bottom);
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 100, y: 130 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
	});

	it("adjacent edges (right → bottom) form a loop around the shared corner (bottom-right)", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.bottom, {
			margin: 20,
		});
		// bulges out past the right edge (x=170) and the bottom edge (y=150), passing through the bottom-right corner (170,150).
		expect(path).toContainEqual({ x: 170, y: 150 });
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
	});

	it("opposite edges (right → left) wrap around one side of the shape", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.left, { margin: 20 });
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 50, y: 100 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
		// wraps out past either the top or bottom edge (passing through 2 corners).
		const wrapsBelow = path.some((p) => p.y === 150);
		const wrapsAbove = path.some((p) => p.y === 50);
		expect(wrapsBelow || wrapsAbove).toBe(true);
	});

	it("top → right also connects to the endpoints without passing through the shape", () => {
		const path = routeSelfLoop(endpoints.top, endpoints.right, { margin: 20 });
		expect(path[0]).toEqual({ x: 100, y: 70 });
		expect(path[path.length - 1]).toEqual({ x: 150, y: 100 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
		// goes around the top-right corner (170,50).
		expect(path).toContainEqual({ x: 170, y: 50 });
	});

	it("endpoints without a box return a direct connection to avoid degeneracy", () => {
		const free: OrthogonalConnectorEndpoint = {
			point: { x: 0, y: 0 },
			direction: "right",
			box: null,
		};
		const other: OrthogonalConnectorEndpoint = {
			point: { x: 10, y: 10 },
			direction: "left",
			box: null,
		};
		const path = routeSelfLoop(free, other);
		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
	});
});
