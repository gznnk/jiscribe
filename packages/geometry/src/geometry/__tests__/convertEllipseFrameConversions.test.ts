import { describe, it, expect } from "vitest";

import { convertEllipseToFrame } from "../../geometry/convertEllipseToFrame";
import { convertFrameToEllipse } from "../../geometry/convertFrameToEllipse";

describe("convertEllipseToFrame", () => {
	it("楕円の半径×2がフレームの寸法になる", () => {
		const result = convertEllipseToFrame({ cx: 10, cy: 20, rx: 50, ry: 30 });
		expect(result).toEqual({ cx: 10, cy: 20, width: 100, height: 60 });
	});
});

describe("convertFrameToEllipse", () => {
	it("フレームの寸法÷2が楕円の半径になる", () => {
		const result = convertFrameToEllipse({
			cx: 10,
			cy: 20,
			width: 100,
			height: 60,
		});
		expect(result).toEqual({ cx: 10, cy: 20, rx: 50, ry: 30 });
	});
});

describe("convertEllipseToFrame / convertFrameToEllipse の相互変換", () => {
	it("Ellipse→Frame→Ellipseで元に戻る", () => {
		const ellipse = { cx: 5, cy: 8, rx: 40, ry: 25 };
		expect(convertFrameToEllipse(convertEllipseToFrame(ellipse))).toEqual(
			ellipse,
		);
	});

	it("Frame→Ellipse→Frameで元に戻る", () => {
		const frame = { cx: 5, cy: 8, width: 80, height: 50 };
		expect(convertEllipseToFrame(convertFrameToEllipse(frame))).toEqual(frame);
	});
});
