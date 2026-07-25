import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForRotatedEllipse } from "../../points/calcOutlinePointTowardForRotatedEllipse";
import type { TransformedEllipse } from "../../types/TransformedEllipse";

const baseEllipse: TransformedEllipse = {
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

	it("回転なしで中心が原点以外・斜め方向でも正しい交点を返す", () => {
		// 中心(10,20)からオフセット(100,60): 正規化距離8 → 交点はオフセット÷√8
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, cx: 10, cy: 20 },
			{ x: 110, y: 80 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(10 + 100 / Math.sqrt(8));
		expect(result!.y).toBeCloseTo(20 + 60 / Math.sqrt(8));
	});

	it("90度回転時は右外側のtowardが回転後の縁（ry=30）に当たる", () => {
		// rx=50, ry=30 を 90度回転すると、ローカルの ry(30) が世界座標の水平方向の縁になる
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, rotation: 90 },
			{ x: 200, y: 0 },
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(30);
		expect(result!.y).toBeCloseTo(0);
	});

	it("rx/ryが0以下の場合はnullを返す", () => {
		const result = calcOutlinePointTowardForRotatedEllipse(
			{ ...baseEllipse, rx: 0 },
			{ x: 200, y: 0 },
		);
		expect(result).toBeNull();
	});
});
