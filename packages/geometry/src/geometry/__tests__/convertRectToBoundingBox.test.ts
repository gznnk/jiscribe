import { describe, expect, it } from "vitest";

import { convertBoundingBoxToRect } from "../../geometry/convertBoundingBoxToRect";
import { convertRectToBoundingBox } from "../../geometry/convertRectToBoundingBox";

describe("convertRectToBoundingBox", () => {
	it("maps the top-left and the extent onto the four edges", () => {
		expect(
			convertRectToBoundingBox({ x: 10, y: 20, width: 30, height: 40 }),
		).toEqual({ left: 10, top: 20, right: 40, bottom: 60 });
	});

	it("normalizes a rect given with a negative extent", () => {
		expect(
			convertRectToBoundingBox({ x: 40, y: 60, width: -30, height: -40 }),
		).toEqual({ left: 10, top: 20, right: 40, bottom: 60 });
	});

	it("keeps a zero-sized rect zero-sized rather than widening it", () => {
		expect(
			convertRectToBoundingBox({ x: 5, y: 5, width: 0, height: 0 }),
		).toEqual({
			left: 5,
			top: 5,
			right: 5,
			bottom: 5,
		});
	});
});

describe("convertBoundingBoxToRect", () => {
	it("maps the four edges onto the top-left and the extent", () => {
		expect(
			convertBoundingBoxToRect({ left: 10, top: 20, right: 40, bottom: 60 }),
		).toEqual({ x: 10, y: 20, width: 30, height: 40 });
	});

	it("round-trips a normalized rect", () => {
		const rect = { x: -5, y: 3, width: 12, height: 7 };
		expect(convertBoundingBoxToRect(convertRectToBoundingBox(rect))).toEqual(
			rect,
		);
	});

	it("reports an inverted box as a negative extent instead of repairing it", () => {
		expect(
			convertBoundingBoxToRect({ left: 40, top: 60, right: 10, bottom: 20 }),
		).toEqual({ x: 40, y: 60, width: -30, height: -40 });
	});
});
