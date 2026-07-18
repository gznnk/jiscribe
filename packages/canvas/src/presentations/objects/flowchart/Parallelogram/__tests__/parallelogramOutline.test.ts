import { describe, it, expect } from "vitest";

import { parallelogramOutline } from "../buildParallelogramPoints";

describe("parallelogramOutline", () => {
	it("skews the top edge right by the skew ratio", () => {
		const points = parallelogramOutline({ width: 100, height: 60 });
		// skew = 100 * 0.22 = 22, centered top-left origin (-50, -30)
		expect(points[0]).toEqual({ x: -28, y: -30 });
		expect(points[3]).toEqual({ x: -50, y: 30 });
	});
});
