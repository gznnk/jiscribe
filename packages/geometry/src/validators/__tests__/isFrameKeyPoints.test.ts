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
	it("8つのPointを持つオブジェクトはtrueを返す", () => {
		expect(isFrameKeyPoints(validKP)).toBe(true);
	});

	it("1つでもPointが欠けている場合はfalseを返す", () => {
		const { topLeft: _omit, ...rest } = validKP;
		expect(isFrameKeyPoints(rest)).toBe(false);
	});

	it("Pointプロパティが不正な場合はfalseを返す", () => {
		expect(isFrameKeyPoints({ ...validKP, topLeft: { x: "0", y: 0 } })).toBe(
			false,
		);
	});

	it("nullはfalseを返す", () => {
		expect(isFrameKeyPoints(null)).toBe(false);
	});

	it("空オブジェクトはfalseを返す", () => {
		expect(isFrameKeyPoints({})).toBe(false);
	});
});
