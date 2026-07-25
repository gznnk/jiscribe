import { describe, it, expect } from "vitest";

import { convertTransformedEllipseToFrame } from "../../geometry/convertTransformedEllipseToFrame";
import { convertTransformedRectToFrame } from "../../geometry/convertTransformedRectToFrame";

describe("convertTransformedRectToFrame", () => {
	it("TransformedRect を TransformedFrame に変換する", () => {
		const result = convertTransformedRectToFrame({
			x: 0,
			y: 0,
			width: 100,
			height: 60,
			rotation: 45,
			scaleX: -1,
			scaleY: 1,
		});
		expect(result).toEqual({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
			rotation: 45,
			scaleX: -1,
			scaleY: 1,
		});
	});

	it("rotation/scaleX/scaleY がそのまま引き継がれる", () => {
		const result = convertTransformedRectToFrame({
			x: 10,
			y: 20,
			width: 80,
			height: 40,
			rotation: 90,
			scaleX: 1,
			scaleY: -1,
		});
		expect(result.rotation).toBe(90);
		expect(result.scaleX).toBe(1);
		expect(result.scaleY).toBe(-1);
		expect(result.cx).toBe(50);
		expect(result.cy).toBe(40);
	});
});

describe("convertTransformedEllipseToFrame", () => {
	it("TransformedEllipse を TransformedFrame に変換する", () => {
		const result = convertTransformedEllipseToFrame({
			cx: 10,
			cy: 20,
			rx: 50,
			ry: 30,
			rotation: 30,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result).toEqual({
			cx: 10,
			cy: 20,
			width: 100,
			height: 60,
			rotation: 30,
			scaleX: 1,
			scaleY: 1,
		});
	});
});
