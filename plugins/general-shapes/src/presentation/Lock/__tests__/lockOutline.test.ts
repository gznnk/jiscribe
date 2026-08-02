import { describe, it, expect } from "vitest";

import { lockOutline } from "../lockOutline";

describe("lockOutline", () => {
	it("rises over the shackle's arch rather than stopping at the body", () => {
		const points = lockOutline({ width: 80, height: 100 });
		const top = Math.min(...points.map((point) => point.y));
		// arch apex = shoulder (0.22h) minus arch (0.22h) = the top edge itself
		expect(top).toBeCloseTo(-50);
		// The body block alone would stop here, inside the drawn shackle.
		expect(top).toBeLessThan(-50 + 100 * 0.36);
	});

	it("reaches both sides, where the body block ends", () => {
		const points = lockOutline({ width: 80, height: 100 });
		const widest = Math.max(...points.map((point) => Math.abs(point.x)));
		// The body block spans the full width, so the outline reaches both sides.
		expect(widest).toBeCloseTo(40);
	});

	it("reaches the bottom of the box, where the body block sits", () => {
		const points = lockOutline({ width: 80, height: 100 });
		expect(Math.max(...points.map((point) => point.y))).toBeCloseTo(50);
	});

	it("leaves the box's top corners outside the shape", () => {
		const points = lockOutline({ width: 80, height: 100 });
		const nearTopCorner = points.some(
			(point) => point.y < -35 && Math.abs(point.x) > 30,
		);
		expect(nearTopCorner).toBe(false);
	});
});
