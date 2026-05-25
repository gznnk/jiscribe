import { describe, it, expect } from "vitest";

import { isLineIntersectingBox } from "../../geometry/isLineIntersectingBox";

const box = {
	left: 0,
	top: 0,
	right: 100,
	bottom: 100,
	center: { x: 50, y: 50 },
	topLeft: { x: 0, y: 0 },
	topRight: { x: 100, y: 0 },
	bottomLeft: { x: 0, y: 100 },
	bottomRight: { x: 100, y: 100 },
};

describe("isLineIntersectingBox", () => {
	it("ボックスを横断する線分はtrueを返す", () => {
		expect(
			isLineIntersectingBox({ x: -10, y: 50 }, { x: 110, y: 50 }, box),
		).toBe(true);
	});

	it("ボックスを縦断する線分はtrueを返す", () => {
		expect(
			isLineIntersectingBox({ x: 50, y: -10 }, { x: 50, y: 110 }, box),
		).toBe(true);
	});

	it("ボックスの外側にある線分はfalseを返す", () => {
		expect(
			isLineIntersectingBox({ x: -50, y: 50 }, { x: -10, y: 50 }, box),
		).toBe(false);
	});

	it("ボックス内部のみの線分はfalseを返す（辺に触れない）", () => {
		expect(isLineIntersectingBox({ x: 10, y: 10 }, { x: 90, y: 90 }, box)).toBe(
			false,
		);
	});

	it("斜めにボックスを横断する線分はtrueを返す", () => {
		// コーナーを通らないようにオフセットした対角線
		expect(
			isLineIntersectingBox({ x: -10, y: 20 }, { x: 110, y: 80 }, box),
		).toBe(true);
	});
});
