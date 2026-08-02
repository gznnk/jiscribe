import { describe, it, expect } from "vitest";

import { parseSvgPathPoints } from "../../__tests__/support/parseSvgPathPoints";
import { buildCloudPath } from "../buildCloudPath";

describe("buildCloudPath", () => {
	it("is a closed path made of cubic segments", () => {
		const path = buildCloudPath(0, 0, 200, 100);
		expect(path.startsWith("M ")).toBe(true);
		expect(path.trimEnd().endsWith("Z")).toBe(true);
		expect(path.match(/C/g)).toHaveLength(6);
	});

	it("keeps every point — control points included — inside the bounding box", () => {
		const [x, y, width, height] = [10, 20, 200, 100];
		const points = parseSvgPathPoints(buildCloudPath(x, y, width, height));

		expect(points.length).toBeGreaterThan(0);
		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(x);
			expect(point.x).toBeLessThanOrEqual(x + width);
			expect(point.y).toBeGreaterThanOrEqual(y);
			expect(point.y).toBeLessThanOrEqual(y + height);
		}
	});

	it("closes back onto the starting point", () => {
		const points = parseSvgPathPoints(buildCloudPath(0, 0, 200, 100));
		expect(points[points.length - 1]).toEqual(points[0]);
	});

	it("translates with the origin without changing the shape", () => {
		const atOrigin = parseSvgPathPoints(buildCloudPath(0, 0, 200, 100));
		const moved = parseSvgPathPoints(buildCloudPath(30, 40, 200, 100));

		atOrigin.forEach((point, index) => {
			expect(moved[index].x - point.x).toBeCloseTo(30);
			expect(moved[index].y - point.y).toBeCloseTo(40);
		});
	});

	it("scales with the box size", () => {
		const small = parseSvgPathPoints(buildCloudPath(0, 0, 100, 50));
		const large = parseSvgPathPoints(buildCloudPath(0, 0, 200, 100));

		small.forEach((point, index) => {
			expect(large[index].x).toBeCloseTo(point.x * 2);
			expect(large[index].y).toBeCloseTo(point.y * 2);
		});
	});

	it("collapses to a point for a zero-sized box rather than producing NaN", () => {
		const points = parseSvgPathPoints(buildCloudPath(5, 5, 0, 0));
		expect(points.every((p) => p.x === 5 && p.y === 5)).toBe(true);
	});
});
