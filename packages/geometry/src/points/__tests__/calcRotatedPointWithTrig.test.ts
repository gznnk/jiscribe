import { describe, it, expect } from "vitest";

import { calcRotatedPointWithTrig } from "../calcRotatedPointWithTrig";

describe("calcRotatedPointWithTrig", () => {
	it("cos=1, sin=0（0回転）は点をそのまま返す", () => {
		const result = calcRotatedPointWithTrig(1, 0, 0, 0, 1, 0);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(0);
	});

	it("原点中心に90度（cos=0, sin=1）回転する", () => {
		// (1, 0) を原点周りに90度回転 → (0, 1)
		const result = calcRotatedPointWithTrig(1, 0, 0, 0, 0, 1);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("任意の中心点周りに回転する", () => {
		// (2, 0) を (1, 0) 中心に90度回転 → (1, 1)
		const result = calcRotatedPointWithTrig(2, 0, 1, 0, 0, 1);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(1);
	});

	it("sin の符号反転で逆回転になる（cos(-θ)=cos, sin(-θ)=-sin）", () => {
		const theta = Math.PI / 3;
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		// +θ で回した点を -θ（sin 符号反転）で戻すと元に戻る
		const rotated = calcRotatedPointWithTrig(3, 2, 1, 1, cos, sin);
		const restored = calcRotatedPointWithTrig(
			rotated.x,
			rotated.y,
			1,
			1,
			cos,
			-sin,
		);
		expect(restored.x).toBeCloseTo(3);
		expect(restored.y).toBeCloseTo(2);
	});
});
