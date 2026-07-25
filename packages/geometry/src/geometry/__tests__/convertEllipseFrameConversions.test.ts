import { describe, it, expect } from "vitest";

import { convertEllipseToFrame } from "../../geometry/convertEllipseToFrame";
import { convertFrameToEllipse } from "../../geometry/convertFrameToEllipse";

describe("convertEllipseToFrame", () => {
	it("doubles the radii into frame dimensions", () => {
		const result = convertEllipseToFrame({ cx: 10, cy: 20, rx: 50, ry: 30 });
		expect(result).toEqual({ cx: 10, cy: 20, width: 100, height: 60 });
	});
});

describe("convertFrameToEllipse", () => {
	it("halves the frame dimensions into radii", () => {
		const result = convertFrameToEllipse({
			cx: 10,
			cy: 20,
			width: 100,
			height: 60,
		});
		expect(result).toEqual({ cx: 10, cy: 20, rx: 50, ry: 30 });
	});
});

describe("convertEllipseToFrame / convertFrameToEllipse round trip", () => {
	it("Ellipse -> Frame -> Ellipse returns the original", () => {
		const ellipse = { cx: 5, cy: 8, rx: 40, ry: 25 };
		expect(convertFrameToEllipse(convertEllipseToFrame(ellipse))).toEqual(
			ellipse,
		);
	});

	it("Frame -> Ellipse -> Frame returns the original", () => {
		const frame = { cx: 5, cy: 8, width: 80, height: 50 };
		expect(convertEllipseToFrame(convertFrameToEllipse(frame))).toEqual(frame);
	});
});
