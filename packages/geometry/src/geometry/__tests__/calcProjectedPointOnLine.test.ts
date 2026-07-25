import { describe, it, expect } from "vitest";

import { calcProjectedPointOnLine } from "../../geometry/calcProjectedPointOnLine";

describe("calcProjectedPointOnLine", () => {
	it("aligns only the y coordinate when projecting onto a horizontal line", () => {
		const result = calcProjectedPointOnLine(
			{ x: 3, y: 5 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 3, y: 0 });
	});

	it("aligns only the x coordinate when projecting onto a vertical line", () => {
		const result = calcProjectedPointOnLine(
			{ x: 4, y: 7 },
			{ x: 0, y: 0 },
			{ x: 0, y: 10 },
		);
		expect(result).toEqual({ x: 0, y: 7 });
	});

	it("projects onto a 45 degree line", () => {
		const result = calcProjectedPointOnLine(
			{ x: 4, y: 0 },
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		);
		expect(result.x).toBeCloseTo(2);
		expect(result.y).toBeCloseTo(2);
	});

	it("returns a point already on the line unchanged", () => {
		const result = calcProjectedPointOnLine(
			{ x: 6, y: 0 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 6, y: 0 });
	});

	it("projects onto the infinite line without clamping to the segment", () => {
		const result = calcProjectedPointOnLine(
			{ x: 15, y: 3 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		);
		expect(result).toEqual({ x: 15, y: 0 });
	});

	it("returns lineStart when the line is degenerate", () => {
		const result = calcProjectedPointOnLine(
			{ x: 8, y: 9 },
			{ x: 2, y: 3 },
			{ x: 2, y: 3 },
		);
		expect(result).toEqual({ x: 2, y: 3 });
	});

	it("projects correctly onto a line that does not start at the origin", () => {
		const result = calcProjectedPointOnLine(
			{ x: 1, y: 12 },
			{ x: 5, y: 5 },
			{ x: 5, y: 15 },
		);
		expect(result).toEqual({ x: 5, y: 12 });
	});
});
