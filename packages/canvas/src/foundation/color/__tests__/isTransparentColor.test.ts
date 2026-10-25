import { describe, expect, it } from "vitest";

import { isTransparentColor } from "../isTransparentColor";

describe("isTransparentColor", () => {
	it("treats an empty string as transparent", () => {
		expect(isTransparentColor("")).toBe(true);
	});

	it.each(["transparent", "Transparent", "TRANSPARENT"])(
		"treats the keyword %s as transparent",
		(color) => {
			expect(isTransparentColor(color)).toBe(true);
		},
	);

	it.each([
		"rgba(0, 0, 0, 0)",
		"rgba(0,0,0,0)",
		"rgba(255, 255, 255, 0)",
		"rgba(255 255 255 / 0)",
		"rgb(10 20 30 / 0)",
		"rgba(255, 0, 0, 0.0)",
		"rgba(255, 0, 0, 0%)",
		"rgba(0, 0, 0, -0.5)",
		"#fff0",
		"#ffffff00",
		"#12345600",
	])("treats %s (alpha 0, any channels) as transparent", (color) => {
		expect(isTransparentColor(color)).toBe(true);
	});

	it.each([
		"rgba(0, 0, 0, 0.5)",
		"rgba(0 0 0 / 0.01)",
		"rgba(0, 0, 0, 50%)",
		"rgb(0, 0, 0)",
		"rgb(0 0 0)",
		"#000",
		"#0001",
		"#000000",
		"#00000001",
	])("treats %s (alpha above 0) as not transparent", (color) => {
		expect(isTransparentColor(color)).toBe(false);
	});

	it.each([
		"hsla(0, 0%, 0%, 0)",
		"hsl(0 0% 0% / 0)",
		"rebeccapurple",
		"var(--jiscribe-canvasBg)",
		"auto",
		"#ff",
		"rgba(0, 0)",
		"rgba(x, y, z, 0)",
		"rgba(0, 0, 0, x)",
	])("treats the unreadable %s as not transparent", (color) => {
		expect(isTransparentColor(color)).toBe(false);
	});
});
