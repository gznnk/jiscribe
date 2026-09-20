import { describe, expect, it } from "vitest";

import {
	calcClockArcPath,
	calcClockSectorPath,
	calcSegmentClockAngles,
} from "../mixedColorArcs";

describe("calcSegmentClockAngles", () => {
	it("starts the first slice straight down and runs clockwise", () => {
		expect(
			calcSegmentClockAngles({ color: "#f00", start: 0, end: 0.5 }),
		).toEqual({ startAngle: 180, endAngle: 360 });
		expect(
			calcSegmentClockAngles({ color: "#0f0", start: 0.5, end: 1 }),
		).toEqual({ startAngle: 360, endAngle: 540 });
	});
});

describe("calcClockSectorPath", () => {
	it("draws the first of two halves on the left: from the bottom, clockwise to the top", () => {
		expect(
			calcClockSectorPath(12, 12, 10, { startAngle: 180, endAngle: 360 }),
		).toBe("M 12 12 L 12 22 A 10 10 0 0 1 12 2 Z");
	});

	it("takes the long way round for a slice past half a turn", () => {
		expect(
			calcClockSectorPath(12, 12, 10, { startAngle: 0, endAngle: 270 }),
		).toBe("M 12 12 L 12 2 A 10 10 0 1 1 2 12 Z");
	});
});

describe("calcClockArcPath", () => {
	it("runs clockwise from the start angle to the end angle", () => {
		expect(calcClockArcPath(12, 12, 8, { startAngle: 90, endAngle: 180 })).toBe(
			"M 20 12 A 8 8 0 0 1 12 20",
		);
	});
});
