import { describe, it, expect } from "vitest";

import { calcManhattanDistance } from "../calcManhattanDistance";

describe("calcManhattanDistance", () => {
	it("is 0 between identical points", () => {
		expect(calcManhattanDistance(0, 0, 0, 0)).toBe(0);
	});

	it("measures horizontal distance", () => {
		expect(calcManhattanDistance(0, 0, 5, 0)).toBe(5);
	});

	it("measures vertical distance", () => {
		expect(calcManhattanDistance(0, 0, 0, 4)).toBe(4);
	});

	it("sums the x and y deltas for diagonal moves", () => {
		expect(calcManhattanDistance(0, 0, 3, 4)).toBe(7);
	});

	it("uses absolute deltas regardless of direction", () => {
		expect(calcManhattanDistance(3, 4, 0, 0)).toBe(7);
	});
});
