import { describe, it, expect } from "vitest";

import { calcStadiumTextRegion } from "../calcStadiumTextRegion";

describe("calcStadiumTextRegion", () => {
	it("横長ではキャップ半径（短辺の半分）を左右にインセットする", () => {
		const result = calcStadiumTextRegion({ width: 200, height: 80 }, "body");
		expect(result).toEqual({ x: -60, y: -40, width: 120, height: 80 });
	});

	it("縦長ではキャップ半径を上下にインセットする", () => {
		const result = calcStadiumTextRegion({ width: 40, height: 200 }, "body");
		expect(result).toEqual({ x: -20, y: -80, width: 40, height: 160 });
	});
});
