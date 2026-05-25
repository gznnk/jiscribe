import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForRotatedFrame } from "../../points/calcOutlinePointTowardForRotatedFrame";

const baseFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcOutlinePointTowardForRotatedFrame", () => {
	it("towardが内部にある場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 10,
			y: 5,
		});
		expect(result).toBeNull();
	});

	it("towardが中心と同じ場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 0,
			y: 0,
		});
		expect(result).toBeNull();
	});

	it("towardが右外側にある場合は右辺の交点を返す", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 200,
			y: 0,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(50);
		expect(result!.y).toBeCloseTo(0);
	});

	it("towardが上外側にある場合は上辺の交点を返す", () => {
		const result = calcOutlinePointTowardForRotatedFrame(baseFrame, {
			x: 0,
			y: -200,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-30);
	});

	it("width/heightが0以下の場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedFrame(
			{ ...baseFrame, width: 0 },
			{ x: 200, y: 0 },
		);
		expect(result).toBeNull();
	});
});
