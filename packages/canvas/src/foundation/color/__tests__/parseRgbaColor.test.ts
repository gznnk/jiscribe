import { describe, expect, it } from "vitest";

import { parseRgbaColor } from "../parseRgbaColor";

describe("parseRgbaColor", () => {
	it("reads every hex length, doubling the digits of the short forms", () => {
		expect(parseRgbaColor("#f80")).toEqual({ r: 255, g: 136, b: 0, alpha: 1 });
		expect(parseRgbaColor("#f800")).toEqual({ r: 255, g: 136, b: 0, alpha: 0 });
		expect(parseRgbaColor("#FF8800")).toEqual({
			r: 255,
			g: 136,
			b: 0,
			alpha: 1,
		});
		expect(parseRgbaColor("#ff880080")).toEqual({
			r: 255,
			g: 136,
			b: 0,
			alpha: 128 / 255,
		});
	});

	it("reads rgb()/rgba() with comma, space and slash separators", () => {
		const expected = { r: 10, g: 20, b: 30, alpha: 0.5 };
		expect(parseRgbaColor("rgba(10, 20, 30, 0.5)")).toEqual(expected);
		expect(parseRgbaColor("rgb(10 20 30 / 0.5)")).toEqual(expected);
		expect(parseRgbaColor("rgba(10 20 30 / 50%)")).toEqual(expected);
		expect(parseRgbaColor("  rgb(10, 20, 30)  ")).toEqual({
			...expected,
			alpha: 1,
		});
	});

	it("clamps and rounds channels, reading % against 255", () => {
		expect(parseRgbaColor("rgb(300, -5, 100%)")).toEqual({
			r: 255,
			g: 0,
			b: 255,
			alpha: 1,
		});
	});

	it("clamps alpha to 0–1", () => {
		expect(parseRgbaColor("rgba(0, 0, 0, -0.5)")?.alpha).toBe(0);
		expect(parseRgbaColor("rgba(0, 0, 0, 1.5)")?.alpha).toBe(1);
		expect(parseRgbaColor("rgba(0 0 0 / 150%)")?.alpha).toBe(1);
	});

	it("returns null for the forms it does not read", () => {
		expect(parseRgbaColor("transparent")).toBeNull();
		expect(parseRgbaColor("rebeccapurple")).toBeNull();
		expect(parseRgbaColor("hsl(0, 0%, 0%)")).toBeNull();
		expect(parseRgbaColor("var(--x)")).toBeNull();
		expect(parseRgbaColor("#ff")).toBeNull();
		expect(parseRgbaColor("rgb(1, 2)")).toBeNull();
		expect(parseRgbaColor("rgb(a, 2, 3)")).toBeNull();
		expect(parseRgbaColor("rgba(1, 2, 3, x)")).toBeNull();
	});
});
