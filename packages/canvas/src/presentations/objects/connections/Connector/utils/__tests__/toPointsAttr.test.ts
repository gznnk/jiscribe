import { describe, it, expect } from "vitest";

import { toPointsAttr } from "../toPointsAttr";

describe("toPointsAttr", () => {
	it("空配列は空文字列を返す", () => {
		expect(toPointsAttr([])).toBe("");
	});

	it("1点は 'x,y' を返す", () => {
		expect(toPointsAttr([{ x: 3, y: 4 }])).toBe("3,4");
	});

	it("複数点をスペース区切りの 'x,y' 列にする", () => {
		expect(
			toPointsAttr([
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
				{ x: 200, y: 0 },
			]),
		).toBe("0,0 100,50 200,0");
	});

	it("小数座標もそのまま文字列化する", () => {
		expect(
			toPointsAttr([
				{ x: 1.5, y: -2.25 },
				{ x: 10, y: 0 },
			]),
		).toBe("1.5,-2.25 10,0");
	});
});
