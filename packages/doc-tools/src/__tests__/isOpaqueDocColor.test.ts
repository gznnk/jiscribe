import { describe, expect, it } from "vitest";

import { isOpaqueDocColor } from "../isOpaqueDocColor";

describe("isOpaqueDocColor", () => {
	it.each([
		"auto",
		"AUTO",
		"#fff",
		"#fffF",
		"#FFFFFF",
		"#ffffffff",
		"rgb(1, 2, 3)",
		"rgba(1, 2, 3, 1)",
		"rgb(1 2 3 / 100%)",
		"rgba(10%, 20%, 30%)",
		"hsl(120deg 50% 50%)",
		"hsla(120, 50%, 50%, 1.0)",
		"white",
		"RebeccaPurple",
		"  #000  ",
	])("reads %j as opaque", (color) => {
		expect(isOpaqueDocColor(color)).toBe(true);
	});

	it.each([
		"",
		"transparent",
		"currentColor",
		"inherit",
		"initial",
		"unset",
		"revert",
		"none",
		"#fff8",
		"#ffffff80",
		"#ff",
		"rgba(1, 2, 3, 0.5)",
		"rgb(1 2 3 / 50%)",
		"hsla(120, 50%, 50%, 0)",
		"rgb(1, 2)",
		"rgb(a, b, c)",
		"var(--paper)",
		"color-mix(in srgb, red, blue)",
		"oklch(70% 0.1 200)",
		"light-dark(white, black)",
	])("does not read %j as opaque", (color) => {
		expect(isOpaqueDocColor(color)).toBe(false);
	});
});
