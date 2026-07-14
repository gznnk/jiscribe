import { describe, it, expect } from "vitest";

import { calloutOutline } from "../calloutOutline";

describe("calloutOutline", () => {
	it("places the tail tip at the bottom, left of center", () => {
		const points = calloutOutline({ width: 100, height: 80 });
		const tip = points.reduce((lowest, p) => (p.y > lowest.y ? p : lowest));
		expect(tip.y).toBeCloseTo(40);
		expect(tip.x).toBeCloseTo(-30);
	});
});
