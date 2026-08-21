import { createInsetTextRegion } from "@jiscribe/canvas-sdk";
import { describe, it, expect } from "vitest";

import { DB_CAP_RATIO } from "../../../schema/db/DbDoc";

describe("db textRegion", () => {
	it("keeps the region clear of the whole top cap and inside the bulge below", () => {
		const textRegion = createInsetTextRegion({
			top: DB_CAP_RATIO * 2,
			bottom: DB_CAP_RATIO,
		});
		const result = textRegion({ width: 120, height: 100 }, "body");
		const capRy = 100 * DB_CAP_RATIO;
		expect(result.x).toBe(-60);
		expect(result.width).toBe(120);
		// The top edge is the bottom of the top cap ellipse; the bottom edge is where the
		// straight sides end, just before the bulge
		expect(result.y).toBeCloseTo(-50 + capRy * 2, 6);
		expect(result.height).toBeCloseTo(100 - capRy * 3, 6);
	});
});
