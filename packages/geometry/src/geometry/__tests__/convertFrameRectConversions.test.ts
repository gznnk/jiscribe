import { describe, it, expect } from "vitest";

import { convertFrameToRect } from "../../geometry/convertFrameToRect";
import { convertRectToFrame } from "../../geometry/convertRectToFrame";

describe("convertFrameToRect", () => {
	it("中心座標から左上座標に変換する", () => {
		const result = convertFrameToRect({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
		});
		expect(result).toEqual({ x: 0, y: 0, width: 100, height: 60 });
	});

	it("オフセットされた中心を変換する", () => {
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
	it("左上座標から中心座標に変換する", () => {
		const result = convertRectToFrame({ x: 0, y: 0, width: 100, height: 60 });
		expect(result).toEqual({ cx: 50, cy: 30, width: 100, height: 60 });
	});

	it("オフセットされた矩形を変換する", () => {
		const result = convertRectToFrame({
			x: 160,
			y: 130,
			width: 80,
			height: 40,
		});
		expect(result).toEqual({ cx: 200, cy: 150, width: 80, height: 40 });
	});
});

describe("convertFrameToRect / convertRectToFrame の相互変換", () => {
	it("Frame→Rect→Frameで元に戻る", () => {
		const frame = { cx: 75, cy: 40, width: 150, height: 80 };
		expect(convertRectToFrame(convertFrameToRect(frame))).toEqual(frame);
	});

	it("Rect→Frame→Rectで元に戻る", () => {
		const rect = { x: 20, y: 30, width: 60, height: 40 };
		expect(convertFrameToRect(convertRectToFrame(rect))).toEqual(rect);
	});
});
