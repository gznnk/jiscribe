import { describe, expect, it } from "vitest";

import { calcEdgeDirectionAndPosition } from "../calcEdgeDirectionAndPosition";

describe("calcEdgeDirectionAndPosition", () => {
	it("picks the edge from the axis dominant after normalizing to half extents", () => {
		// x is larger in px, but y is larger relative to the half extents
		expect(
			calcEdgeDirectionAndPosition({ x: 40, y: 30 }, 200, 50).direction,
		).toBe("down");
		expect(
			calcEdgeDirectionAndPosition({ x: -90, y: 5 }, 200, 50).direction,
		).toBe("left");
	});

	it("measures the position along a horizontal edge from x and a vertical edge from y", () => {
		expect(calcEdgeDirectionAndPosition({ x: 50, y: -40 }, 200, 50)).toEqual({
			direction: "up",
			position: 0.75,
		});
		expect(calcEdgeDirectionAndPosition({ x: 120, y: -5 }, 200, 50)).toEqual({
			direction: "right",
			position: 0.4,
		});
	});

	it("clamps a point beyond the edge's end to 0..1", () => {
		expect(calcEdgeDirectionAndPosition({ x: 500, y: -400 }, 200, 50)).toEqual({
			direction: "up",
			position: 1,
		});
		expect(calcEdgeDirectionAndPosition({ x: -500, y: 400 }, 200, 50)).toEqual({
			direction: "down",
			position: 0,
		});
	});

	it("rounds the position to 4 decimals", () => {
		expect(
			calcEdgeDirectionAndPosition({ x: 1 / 3, y: -100 }, 3, 50).position,
		).toBe(0.6111);
	});

	it("reads a zero extent as 0 on that axis and puts the position at 0.5", () => {
		expect(calcEdgeDirectionAndPosition({ x: 30, y: 10 }, 0, 50)).toEqual({
			direction: "down",
			position: 0.5,
		});
	});
});
