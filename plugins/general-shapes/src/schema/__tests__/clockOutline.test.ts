import { describe, it, expect } from "vitest";

import { clockOutline } from "../clock/clockOutline";
import { expectStarShapedAboutCenter } from "./support/expectStarShapedAboutCenter";

describe("clockOutline", () => {
	it("is star-shaped about the center, so a connector endpoint moves continuously", () => {
		expectStarShapedAboutCenter(clockOutline({ width: 100, height: 100 }));
		expectStarShapedAboutCenter(clockOutline({ width: 200, height: 50 }));
	});

	it("follows the face rather than the box, never coming near a corner", () => {
		const points = clockOutline({ width: 100, height: 100 });
		const radii = points.map((point) => Math.hypot(point.x, point.y));
		for (const radius of radii) {
			expect(radius).toBeCloseTo(50);
		}
	});

	it("keeps every edge close to the drawn rim, not only its corners", () => {
		// A chord sags inside the rim most at its midpoint. Twelve segments round
		// the whole face would sag 3.4% of the radius; the budget allows under 1%.
		const points = clockOutline({ width: 100, height: 100 });
		points.forEach((point, index) => {
			const next = points[(index + 1) % points.length];
			const midpoint = {
				x: (point.x + next.x) / 2,
				y: (point.y + next.y) / 2,
			};
			expect(Math.hypot(midpoint.x, midpoint.y)).toBeGreaterThan(49.5);
		});
	});

	it("does not repeat its starting point at the end", () => {
		const points = clockOutline({ width: 100, height: 100 });
		const first = points[0];
		const last = points[points.length - 1];
		expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeGreaterThan(1);
	});

	it("stretches with the box into an ellipse", () => {
		const points = clockOutline({ width: 200, height: 50 });
		expect(Math.max(...points.map((point) => Math.abs(point.x)))).toBeCloseTo(
			100,
		);
		expect(Math.max(...points.map((point) => Math.abs(point.y)))).toBeCloseTo(
			25,
		);
	});
});
