import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForRotatedEllipse } from "../../points/calcOutlinePointTowardForRotatedEllipse";

const baseEllipse = {
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcOutlinePointTowardForRotatedEllipse", () => {
	it("towardが内部にある場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 10,
			y: 5,
		});
		expect(result).toBeNull();
	});

	it("towardが中心と同じ場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 0,
			y: 0,
		});
		expect(result).toBeNull();
	});

	it("towardが右外側にある場合は右端の交点を返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 200,
			y: 0,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(50);
		expect(result!.y).toBeCloseTo(0);
	});

	it("towardが上外側にある場合は上端の交点を返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(baseEllipse, {
			x: 0,
			y: -200,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-30);
	});

	it("rx/ryが0以下の場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, rx: 0 },
			{ x: 200, y: 0 },
		);
		expect(result).toBeNull();
	});
});
