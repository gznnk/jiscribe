import { describe, it, expect } from "vitest";

import { convertFrameToRect } from "../../geometry/convertFrameToRect";
import { convertRectToFrame } from "../../geometry/convertRectToFrame";

describe("convertFrameToRect", () => {
	it("converts center coordinates to top-left coordinates", () => {
		const result = convertFrameToRect({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
		});
		expect(result).toEqual({ x: 0, y: 0, width: 100, height: 60 });
	});

	it("converts an off-origin center", () => {
		const result = convertFrameToRect({
			cx: 200,
			cy: 150,
			width: 80,
			height: 40,
		});
		expect(result).toEqual({ x: 160, y: 130, width: 80, height: 40 });
	});
});

describe("convertRectToFrame", () => {
	it("converts top-left coordinates to center coordinates", () => {
		const result = convertRectToFrame({ x: 0, y: 0, width: 100, height: 60 });
		expect(result).toEqual({ cx: 50, cy: 30, width: 100, height: 60 });
	});

	it("converts an off-origin rectangle", () => {
		const result = convertRectToFrame({
			x: 160,
			y: 130,
			width: 80,
			height: 40,
		});
		expect(result).toEqual({ cx: 200, cy: 150, width: 80, height: 40 });
	});
});

describe("convertFrameToRect / convertRectToFrame round trip", () => {
	it("Frame -> Rect -> Frame returns the original", () => {
		const frame = { cx: 75, cy: 40, width: 150, height: 80 };
		expect(convertRectToFrame(convertFrameToRect(frame))).toEqual(frame);
	});

	it("Rect -> Frame -> Rect returns the original", () => {
		const rect = { x: 20, y: 30, width: 60, height: 40 };
		expect(convertFrameToRect(convertRectToFrame(rect))).toEqual(rect);
	});
});
