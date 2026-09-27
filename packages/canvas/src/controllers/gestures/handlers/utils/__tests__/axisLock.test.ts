import { describe, expect, it } from "vitest";

import { applyAxisLock, ORIGIN_SNAP_PX } from "../axisLock";

const origin = { x: 100, y: 100 };

describe("applyAxisLock", () => {
	it("without Shift, returns the cursor untouched and no feedback", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 150, y: 130 },
				{ shift: false, zoom: 1, originSnap: true },
			),
		).toEqual({
			point: { x: 150, y: 130 },
			lockedAxis: null,
			snapToOrigin: false,
			feedback: null,
		});
	});

	it("a horizontal-dominant move locks Y to the origin", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 150, y: 130 },
				{ shift: true, zoom: 1, originSnap: true },
			),
		).toEqual({
			point: { x: 150, y: 100 },
			lockedAxis: "y",
			snapToOrigin: false,
			feedback: { y: 100 },
		});
	});

	it("a vertical-dominant move locks X to the origin", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 80, y: 20 },
				{ shift: true, zoom: 1, originSnap: true },
			),
		).toEqual({
			point: { x: 100, y: 20 },
			lockedAxis: "x",
			snapToOrigin: false,
			feedback: { x: 100 },
		});
	});

	it("a tie locks Y", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 130, y: 130 },
				{ shift: true, zoom: 1, originSnap: true },
			).lockedAxis,
		).toBe("y");
	});

	it("a free-axis move within the threshold snaps to the origin with a crosshair", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 100 + ORIGIN_SNAP_PX, y: 101 },
				{ shift: true, zoom: 1, originSnap: true },
			),
		).toEqual({
			point: { x: 100, y: 100 },
			lockedAxis: "y",
			snapToOrigin: true,
			feedback: { x: 100, y: 100 },
		});
	});

	it("the origin-snap threshold is in screen px (scaled by zoom)", () => {
		// 6px on screen is 3 SVG units at zoom 2
		const result = applyAxisLock(
			origin,
			{ x: 104, y: 100 },
			{ shift: true, zoom: 2, originSnap: true },
		);
		expect(result.snapToOrigin).toBe(false);
		expect(result.point).toEqual({ x: 104, y: 100 });
	});

	it("with originSnap disabled, a tiny move stays on the locked axis", () => {
		expect(
			applyAxisLock(
				origin,
				{ x: 103, y: 101 },
				{ shift: true, zoom: 1, originSnap: false },
			),
		).toEqual({
			point: { x: 103, y: 100 },
			lockedAxis: "y",
			snapToOrigin: false,
			feedback: { y: 100 },
		});
	});
});
