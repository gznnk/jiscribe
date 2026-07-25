import { describe, it, expect } from "vitest";

import { calcPolyKeyPoints } from "../../geometry/calcPolyKeyPoints";

describe("calcPolyKeyPoints", () => {
	it("returns null for an empty array", () => {
		expect(calcPolyKeyPoints([])).toBeNull();
	});

	it("computes key points from the points of a rectangle", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		const kp = calcPolyKeyPoints(points);
		expect(kp).not.toBeNull();
		expect(kp!.topLeft).toEqual({ x: 0, y: 0 });
		expect(kp!.topRight).toEqual({ x: 100, y: 0 });
		expect(kp!.bottomRight).toEqual({ x: 100, y: 60 });
		expect(kp!.topCenter).toEqual({ x: 50, y: 0 });
		expect(kp!.leftCenter).toEqual({ x: 0, y: 30 });
	});

	it("returns all eight key points", () => {
		const kp = calcPolyKeyPoints([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
		expect(kp).not.toBeNull();
		expect(kp).toHaveProperty("topLeft");
		expect(kp).toHaveProperty("topCenter");
		expect(kp).toHaveProperty("topRight");
		expect(kp).toHaveProperty("rightCenter");
		expect(kp).toHaveProperty("bottomRight");
		expect(kp).toHaveProperty("bottomCenter");
		expect(kp).toHaveProperty("bottomLeft");
		expect(kp).toHaveProperty("leftCenter");
	});
});
