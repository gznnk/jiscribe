import { describe, expect, it, vi } from "vitest";

import { isOpaqueCssColor } from "../isOpaqueCssColor";

// Node has no canvas; stand in for the browser's serialization so only the
// opacity rule is under test here (normalizeCssColor.test covers the probe).
const BROWSER_SPELLINGS: Record<string, string> = {
	"#0b1220": "#0b1220",
	red: "#ff0000",
	"hsl(0 72% 51%)": "#dc2828",
	"rgba(220, 38, 38, 1)": "#dc2626",
	transparent: "rgba(0, 0, 0, 0)",
	"rgba(220, 38, 38, 0.5)": "rgba(220, 38, 38, 0.5)",
	"#ffffff80": "rgba(255, 255, 255, 0.5)",
	"hsl(0 72% 51% / 0.5)": "rgba(220, 40, 40, 0.5)",
	"oklch(0.6 0.2 30)": "oklch(0.6 0.2 30)",
	"color-mix(in srgb, red 50%, transparent)":
		"color-mix(in srgb, red 50%, transparent)",
};

vi.mock("../normalizeCssColor", () => ({
	normalizeCssColor: (color: string) => BROWSER_SPELLINGS[color] ?? null,
}));

describe("isOpaqueCssColor", () => {
	it.each(["#0b1220", "red", "hsl(0 72% 51%)", "rgba(220, 38, 38, 1)"])(
		"treats %s, which the browser spells with alpha 1, as opaque",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(true);
		},
	);

	it.each([
		"transparent",
		"rgba(220, 38, 38, 0.5)",
		"#ffffff80",
		"hsl(0 72% 51% / 0.5)",
	])("rejects %s, whose resolved alpha is below 1", (color) => {
		expect(isOpaqueCssColor(color)).toBe(false);
	});

	it.each(["oklch(0.6 0.2 30)", "color-mix(in srgb, red 50%, transparent)"])(
		"rejects %s, which the browser keeps in a spelling that is not read",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(false);
		},
	);

	it.each(["auto", "", "var(--x)", "currentColor"])(
		"rejects %j, which the browser does not resolve to one color",
		(color) => {
			expect(isOpaqueCssColor(color)).toBe(false);
		},
	);
});
