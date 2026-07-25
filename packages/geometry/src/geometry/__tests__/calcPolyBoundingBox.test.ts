import { describe, it, expect } from "vitest";

import { calcPolyBoundingBox } from "../../geometry/calcPolyBoundingBox";

describe("calcPolyBoundingBox", () => {
	it("returns null for an empty array", () => {
		expect(calcPolyBoundingBox([])).toBeNull();
	});

	it("returns a degenerate box for a single point", () => {
		const result = calcPolyBoundingBox([{ x: 5, y: 3 }]);
		expect(result).toEqual({ left: 5, right: 5, top: 3, bottom: 3 });
	});

	it("computes the box over several points", () => {
		const points = [
			{ x: 1, y: 4 },
			{ x: 5, y: 2 },
			{ x: 3, y: 7 },
			{ x: -1, y: 1 },
		];
		const result = calcPolyBoundingBox(points);
		expect(result).toEqual({ left: -1, right: 5, top: 1, bottom: 7 });
	});

	it("handles points that all share the same coordinates", () => {
		const result = calcPolyBoundingBox([
			{ x: 2, y: 3 },
			{ x: 2, y: 3 },
		]);
		expect(result).toEqual({ left: 2, right: 2, top: 3, bottom: 3 });
	});
});
