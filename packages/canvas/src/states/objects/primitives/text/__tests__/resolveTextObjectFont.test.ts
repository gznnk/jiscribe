import { describe, expect, it } from "vitest";

import { resolveTextObjectFont } from "../resolveTextObjectFont";

/**
 * Tested as the pure function it is rather than through a measurement: outside a
 * browser `measureTextWidth` estimates from the character count and reads neither
 * family, weight nor style, so a measured assertion would hold with the whole
 * precedence deleted.
 */
const THEME_FAMILY = "Noto Sans JP";

describe("resolveTextObjectFont", () => {
	it("takes every field the object sets in preference to the theme's family", () => {
		expect(
			resolveTextObjectFont(
				{
					fontSize: 24,
					fontFamily: "Courier New",
					fontWeight: "bold",
					fontStyle: "italic",
				},
				THEME_FAMILY,
			),
		).toEqual({
			fontSize: 24,
			fontFamily: "Courier New",
			fontWeight: "bold",
			fontStyle: "italic",
		});
	});

	it("falls back to the given family only when the object names none", () => {
		expect(resolveTextObjectFont({}, THEME_FAMILY).fontFamily).toBe(
			THEME_FAMILY,
		);
		expect(
			resolveTextObjectFont({ fontFamily: "Courier New" }, THEME_FAMILY)
				.fontFamily,
		).toBe("Courier New");
	});

	it("fills an unset size and weight with what the overlay draws with", () => {
		// The overlay's own defaults, so the box and the glyphs inside it are
		// measured against the same font when the object styles nothing.
		expect(resolveTextObjectFont({}, THEME_FAMILY)).toEqual({
			fontSize: 16,
			fontFamily: THEME_FAMILY,
			fontWeight: "normal",
			fontStyle: undefined,
		});
	});

	it("leaves an unset style unset rather than naming a default", () => {
		// measureText treats an absent fontStyle as "normal" itself; naming it here
		// too would be a second place for the two to drift apart.
		expect(resolveTextObjectFont({}, THEME_FAMILY).fontStyle).toBeUndefined();
		expect(
			resolveTextObjectFont({ fontStyle: "italic" }, THEME_FAMILY).fontStyle,
		).toBe("italic");
	});

	it("keeps a numeric weight as written, the shorthand taking either form", () => {
		expect(
			resolveTextObjectFont({ fontWeight: "600" }, THEME_FAMILY).fontWeight,
		).toBe("600");
	});
});
