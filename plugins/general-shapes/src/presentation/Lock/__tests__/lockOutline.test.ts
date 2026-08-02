import { describe, it, expect } from "vitest";

import { lockOutline } from "../lockOutline";

describe("lockOutline", () => {
	it("rises over the shackle's arch rather than stopping at the body", () => {
		const points = lockOutline({ width: 90, height: 110 });
		const top = Math.min(...points.map((point) => point.y));
		// arch apex = shoulder (0.3h) minus arch (0.2h) = 0.1h below the top edge
		expect(top).toBeCloseTo(-55 + 110 * 0.1);
		// The body block alone would stop here, inside the drawn shackle.
		expect(top).toBeLessThan(-55 + 110 * 0.42);
	});

	it("keeps the sides at the body block, not at the box", () => {
		const points = lockOutline({ width: 90, height: 110 });
		const widest = Math.max(...points.map((point) => Math.abs(point.x)));
		expect(widest).toBeCloseTo(45 - 90 * 0.06);
	});

	it("reaches the bottom of the box, where the body block sits", () => {
		const points = lockOutline({ width: 90, height: 110 });
		expect(Math.max(...points.map((point) => point.y))).toBeCloseTo(55);
	});

	it("leaves the box's top corners outside the shape", () => {
		const points = lockOutline({ width: 90, height: 110 });
		const nearTopCorner = points.some(
			(point) => point.y < -30 && Math.abs(point.x) > 30,
		);
		expect(nearTopCorner).toBe(false);
	});
});
