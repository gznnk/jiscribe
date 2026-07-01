import { describe, it, expect } from "vitest";

import { getResizeCursorForRotation } from "../getResizeCursorForRotation";

describe("getResizeCursorForRotation", () => {
	describe("no rotation, standard scale (offset=0 = right handle)", () => {
		it("rotation=0 → e-resize", () => {
			expect(getResizeCursorForRotation(0, 0)).toBe("e-resize");
		});

		it("rotation=45 → se-resize", () => {
			expect(getResizeCursorForRotation(0, 45)).toBe("se-resize");
		});

		it("rotation=90 → s-resize", () => {
			expect(getResizeCursorForRotation(0, 90)).toBe("s-resize");
		});

		it("rotation=135 → sw-resize", () => {
			expect(getResizeCursorForRotation(0, 135)).toBe("sw-resize");
		});

		it("rotation=180 → w-resize", () => {
			expect(getResizeCursorForRotation(0, 180)).toBe("w-resize");
		});

		it("rotation=225 → nw-resize", () => {
			expect(getResizeCursorForRotation(0, 225)).toBe("nw-resize");
		});

		it("rotation=270 → n-resize", () => {
			expect(getResizeCursorForRotation(0, 270)).toBe("n-resize");
		});

		it("rotation=315 → ne-resize", () => {
			expect(getResizeCursorForRotation(0, 315)).toBe("ne-resize");
		});
	});

	describe("initial direction specified by offset", () => {
		it("offset=90 (bottom handle) rotation=0 -> s-resize", () => {
			expect(getResizeCursorForRotation(90, 0)).toBe("s-resize");
		});

		it("offset=45 (bottom-right corner) rotation=0 -> se-resize", () => {
			expect(getResizeCursorForRotation(45, 0)).toBe("se-resize");
		});

		it("offset=90 (bottom handle) rotation=90 -> w-resize (90+90=180->w)", () => {
			expect(getResizeCursorForRotation(90, 90)).toBe("w-resize");
		});
	});

	describe("scaleX is negative (horizontal flip)", () => {
		it("offset=0 scaleX=-1 -> local angle mirrored to 180 -> w-resize", () => {
			expect(getResizeCursorForRotation(0, 0, -1, 1)).toBe("w-resize");
		});

		it("offset=45 scaleX=-1 -> 180-45=135 -> sw-resize", () => {
			expect(getResizeCursorForRotation(45, 0, -1, 1)).toBe("sw-resize");
		});
	});

	describe("scaleY is negative (vertical flip)", () => {
		it("offset=90 scaleY=-1 -> local angle -90 = 270 -> n-resize", () => {
			expect(getResizeCursorForRotation(90, 0, 1, -1)).toBe("n-resize");
		});
	});

	describe("both scaleX and scaleY negative", () => {
		it("offset=0 both flipped -> 180-0=180 -> with scaleY=-1, -180=-180+360=180 -> w-resize", () => {
			// localAngle: scaleX<0 -> 180-0=180; scaleY<0 -> -180; norm=180 -> w-resize
			expect(getResizeCursorForRotation(0, 0, -1, -1)).toBe("w-resize");
		});
	});

	describe("boundary values (around 22.5 degrees)", () => {
		it("rotation=22 -> e-resize (below 22.5)", () => {
			expect(getResizeCursorForRotation(0, 22)).toBe("e-resize");
		});

		it("rotation=23 -> se-resize (22.5 or above)", () => {
			expect(getResizeCursorForRotation(0, 23)).toBe("se-resize");
		});

		it("rotation=337 -> ne-resize (below 337.5)", () => {
			expect(getResizeCursorForRotation(0, 337)).toBe("ne-resize");
		});

		it("rotation=338 -> e-resize (337.5 or above)", () => {
			expect(getResizeCursorForRotation(0, 338)).toBe("e-resize");
		});
	});

	describe("negative rotation", () => {
		it("rotation=-45 -> ne-resize (equivalent to 315 degrees)", () => {
			expect(getResizeCursorForRotation(0, -45)).toBe("ne-resize");
		});
	});
});
