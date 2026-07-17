import { describe, it, expect } from "vitest";

import { calloutOutline } from "../calloutOutline";

describe("calloutOutline", () => {
	it("places the tail tip at the bottom, left of center by default", () => {
		const points = calloutOutline({ width: 100, height: 80 });
		const tip = points.reduce((lowest, p) => (p.y > lowest.y ? p : lowest));
		expect(tip.y).toBeCloseTo(40);
		expect(tip.x).toBeCloseTo(-30);
	});

	it("follows state.tail (right side)", () => {
		const points = calloutOutline({
			width: 100,
			height: 80,
			tail: { side: "right", position: 0.5 },
		});
		const tip = points.reduce((rightmost, p) =>
			p.x > rightmost.x ? p : rightmost,
		);
		expect(tip.x).toBeCloseTo(50);
		expect(tip.y).toBeCloseTo(0);
	});
});
