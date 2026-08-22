import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { describe, expect, it } from "vitest";

import { resolveTextObjectFont } from "../resolveTextObjectFont";

/**
 * Tested as the pure function it is rather than through a measurement: outside a
 * browser `measureTextWidth` estimates from the character count and reads neither
 * family, weight nor style, so a measured assertion would hold with the whole
 * precedence deleted.
 */
describe("resolveTextObjectFont", () => {
	it("takes every field the object sets in preference to the fallbacks", () => {
		expect(
			resolveTextObjectFont({
				fontSize: 24,
				fontFamily: "Courier New",
				fontWeight: "bold",
				fontStyle: "italic",
			}),
		).toEqual({
			fontSize: 24,
			fontFamily: "Courier New",
			fontWeight: "bold",
			fontStyle: "italic",
		});
	});

	it("falls back to DEFAULT_FONT_FAMILY only when the object names none", () => {
		expect(resolveTextObjectFont({}).fontFamily).toBe(DEFAULT_FONT_FAMILY);
		expect(
			resolveTextObjectFont({ fontFamily: "Courier New" }).fontFamily,
		).toBe("Courier New");
	});

	it("fills an unset size and weight with what the overlay draws with", () => {
		// The overlay's own defaults, so the box and the glyphs inside it are
		// measured against the same font when the object styles nothing.
		expect(resolveTextObjectFont({})).toEqual({
			fontSize: 16,
			fontFamily: DEFAULT_FONT_FAMILY,
			fontWeight: "normal",
			fontStyle: undefined,
		});
	});

	it("leaves an unset style unset rather than naming a default", () => {
		// The measurement treats an absent fontStyle as "normal" itself (see
		// createTextWidthMeasurer); naming it here too would be a second place for
		// the two to drift apart.
		expect(resolveTextObjectFont({}).fontStyle).toBeUndefined();
		expect(resolveTextObjectFont({ fontStyle: "italic" }).fontStyle).toBe(
			"italic",
		);
	});

	it("keeps a numeric weight as written, the shorthand taking either form", () => {
		expect(resolveTextObjectFont({ fontWeight: "600" }).fontWeight).toBe("600");
	});
});
