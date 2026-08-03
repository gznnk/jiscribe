import { describe, expect, it } from "vitest";

import { noteOutline } from "../noteOutline";

describe("noteOutline", () => {
	it("follows the cut corner rather than the bounding box", () => {
		const points = noteOutline({ width: 180, height: 110 });
		expect(points).toHaveLength(5);
		// Without the outline, a connector aimed at the center would stop at the
		// box corner (90, -55), which the drawing does not reach.
		expect(points).not.toContainEqual({ x: 90, y: -55 });
		expect(points[1]).toEqual({ x: 68, y: -55 });
		expect(points[2]).toEqual({ x: 90, y: -33 });
	});

	it("keeps the other three corners on the bounding box", () => {
		const points = noteOutline({ width: 180, height: 110 });
		expect(points[0]).toEqual({ x: -90, y: -55 });
		expect(points[3]).toEqual({ x: 90, y: 55 });
		expect(points[4]).toEqual({ x: -90, y: 55 });
	});

	it("stays inside the bounding box on a long note", () => {
		const points = noteOutline({ width: 600, height: 110 });
		expect(Math.max(...points.map((point) => point.x))).toBe(300);
		expect(Math.min(...points.map((point) => point.y))).toBe(-55);
	});
});
