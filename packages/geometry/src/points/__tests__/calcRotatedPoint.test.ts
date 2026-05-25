import { describe, it, expect } from "vitest";

import { calcRotatedPoint } from "../calcRotatedPoint";

describe("calcRotatedPoint", () => {
	it("0ラジアン回転は点をそのまま返す", () => {
		const result = calcRotatedPoint(1, 0, 0, 0, 0);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(0);
	});

	it("原点中心に90度（π/2）回転する", () => {
		// (1, 0) を原点周りに90度回転 → (0, 1)
		const result = calcRotatedPoint(1, 0, 0, 0, Math.PI / 2);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("原点中心に180度（π）回転する", () => {
		// (1, 0) を原点周りに180度回転 → (-1, 0)
		const result = calcRotatedPoint(1, 0, 0, 0, Math.PI);
		expect(result.x).toBeCloseTo(-1);
		expect(result.y).toBeCloseTo(0);
	});

	it("任意の中心点周りに回転する", () => {
		// (2, 0) を (1, 0) 中心に90度回転 → (1, 1)
		const result = calcRotatedPoint(2, 0, 1, 0, Math.PI / 2);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(1);
	});
});
