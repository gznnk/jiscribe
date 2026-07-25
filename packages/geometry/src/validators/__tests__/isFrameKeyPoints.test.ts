import { describe, it, expect } from "vitest";

import { isFrameKeyPoints } from "../isFrameKeyPoints";

const validKP = {
	topLeft: { x: 0, y: 0 },
	topCenter: { x: 50, y: 0 },
	topRight: { x: 100, y: 0 },
	rightCenter: { x: 100, y: 30 },
	bottomRight: { x: 100, y: 60 },
	bottomCenter: { x: 50, y: 60 },
	bottomLeft: { x: 0, y: 60 },
	leftCenter: { x: 0, y: 30 },
};

describe("isFrameKeyPoints", () => {
	it("returns true for an object holding all eight points", () => {
		expect(isFrameKeyPoints(validKP)).toBe(true);
	});

	it("returns false when any point is missing", () => {
		const { topLeft: _omit, ...rest } = validKP;
		expect(isFrameKeyPoints(rest)).toBe(false);
	});

	it("returns false when a point property is malformed", () => {
		expect(isFrameKeyPoints({ ...validKP, topLeft: { x: "0", y: 0 } })).toBe(
			false,
		);
	});

	it("returns false for null", () => {
		expect(isFrameKeyPoints(null)).toBe(false);
	});

	it("returns false for an empty object", () => {
		expect(isFrameKeyPoints({})).toBe(false);
	});
});
