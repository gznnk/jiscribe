import { describe, it, expect } from "vitest";

import { calcEuclideanDistance } from "../calcEuclideanDistance";

describe("calcEuclideanDistance", () => {
	it("is 0 between identical points", () => {
		expect(calcEuclideanDistance(0, 0, 0, 0)).toBe(0);
		expect(calcEuclideanDistance(3, 4, 3, 4)).toBe(0);
	});

	it("measures horizontal distance", () => {
		expect(calcEuclideanDistance(0, 0, 5, 0)).toBe(5);
		expect(calcEuclideanDistance(2, 1, 8, 1)).toBe(6);
	});

	it("measures vertical distance", () => {
		expect(calcEuclideanDistance(0, 0, 0, 3)).toBe(3);
	});

	it("measures diagonal distance (3-4-5 triangle)", () => {
		expect(calcEuclideanDistance(0, 0, 3, 4)).toBe(5);
	});

	it("handles negative coordinates", () => {
		expect(calcEuclideanDistance(-1, -1, 2, 3)).toBeCloseTo(5);
	});
});
