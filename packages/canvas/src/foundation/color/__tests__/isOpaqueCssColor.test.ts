import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOpaqueCssColor } from "../isOpaqueCssColor";

// Node has no `CSS`; stand in for the browser's parser with a list of what it
// accepts, so only the opacity rule is under test here.
const BROWSER_ACCEPTED_COLORS = new Set([
	"#0b1220",
	"#fff",
	"#ffffff80",
	"#fff8",
	"rgb(220, 38, 38)",
	"rgba(220, 38, 38, 1)",
	"rgba(220, 38, 38, 0.5)",
	"rgba(0, 0, 0, 0)",
	"rgb(220 38 38 / 50%)",
	"transparent",
	"red",
	"hsl(0 72% 51%)",
]);

describe("isOpaqueCssColor", () => {
	beforeEach(() => {
		vi.stubGlobal("CSS", {
			supports: (_property: string, value: string) =>
				BROWSER_ACCEPTED_COLORS.has(value),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it.each(["#0b1220", "#fff", "rgb(220, 38, 38)", "rgba(220, 38, 38, 1)"])(
		"treats %s (alpha 1) as opaque",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(true);
		},
	);

	it.each(["red", "hsl(0 72% 51%)"])(
		"treats %s (alpha not read) as opaque",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(true);
		},
	);

	it.each(["transparent", "rgba(0, 0, 0, 0)"])(
		"rejects %s, which paints nothing",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(false);
		},
	);

	it.each([
		"rgba(220, 38, 38, 0.5)",
		"rgb(220 38 38 / 50%)",
		"#ffffff80",
		"#fff8",
	])("rejects %s, which is semi-transparent", (color) => {
		expect(isOpaqueCssColor(color)).toBe(false);
	});

	it.each(["auto", "", "not-a-color"])(
		"rejects %j, which the browser does not parse as a color",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(false);
		},
	);
});
