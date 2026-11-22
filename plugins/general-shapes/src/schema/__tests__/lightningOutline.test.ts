import { describe, it, expect } from "vitest";

import { lightningOutline } from "../lightning/lightningOutline";
import { expectStarShapedAboutCenter } from "./support/expectStarShapedAboutCenter";

describe("lightningOutline", () => {
	it("is star-shaped about the center at any aspect ratio, so a connector endpoint moves continuously", () => {
		// If the center fell outside the bolt, the ray to the far side would land on
		// the bounding box instead, and the connector would cross the bolt.
		expectStarShapedAboutCenter(lightningOutline({ width: 70, height: 100 }));
		expectStarShapedAboutCenter(lightningOutline({ width: 600, height: 100 }));
		expectStarShapedAboutCenter(lightningOutline({ width: 100, height: 600 }));
	});

	it("puts its tips on the top and bottom edges and its step on the sides", () => {
		const points = lightningOutline({ width: 70, height: 100 });
		const top = points.filter((point) => point.y === -50);
		const bottom = points.filter((point) => point.y === 50);
		const left = points.filter((point) => point.x === -35);
		const right = points.filter((point) => point.x === 35);
		expect([top, bottom, left, right].map((edge) => edge.length)).toEqual([
			1, 1, 1, 1,
		]);
		// The upper tip leans right and the lower one left: one bolt, not a Z.
		expect(top[0].x).toBeGreaterThan(0);
		expect(bottom[0].x).toBeLessThan(0);
	});

	it("is the same bolt turned half a turn about the center", () => {
		const points = lightningOutline({ width: 70, height: 100 });
		for (let i = 0; i < 3; i++) {
			expect(points[i + 3].x).toBeCloseTo(-points[i].x);
			expect(points[i + 3].y).toBeCloseTo(-points[i].y);
		}
	});
});
