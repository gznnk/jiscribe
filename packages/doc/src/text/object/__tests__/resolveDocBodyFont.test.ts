import { describe, expect, it } from "vitest";

import { DEFAULT_FONT_FAMILY } from "../../style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "../../style/textStyleFallback";
import { resolveDocBodyFont } from "../resolveDocBodyFont";

describe("resolveDocBodyFont", () => {
	it("fills every field from the shared fallback for a doc stating nothing", () => {
		expect(resolveDocBodyFont({})).toEqual({
			fontSize: TEXT_STYLE_FALLBACK.fontSize,
			fontFamily: DEFAULT_FONT_FAMILY,
			fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
			fontStyle: undefined,
		});
	});

	it("takes the type's body defaults over the shared fallback", () => {
		expect(
			resolveDocBodyFont(
				{},
				{ fontSize: 24, fontFamily: "Caveat", fontWeight: "bold" },
			),
		).toMatchObject({ fontSize: 24, fontFamily: "Caveat", fontWeight: "bold" });
	});

	it("takes the doc's own fields over the type's defaults", () => {
		expect(
			resolveDocBodyFont(
				{
					fontSize: 12,
					fontFamily: "Klee One",
					fontWeight: "normal",
					fontStyle: "italic",
				},
				{ fontSize: 24, fontFamily: "Caveat", fontWeight: "bold" },
			),
		).toEqual({
			fontSize: 12,
			fontFamily: "Klee One",
			fontWeight: "normal",
			fontStyle: "italic",
		});
	});

	it("ignores a field of the wrong type, falling through to the default beneath it", () => {
		expect(
			resolveDocBodyFont(
				{ fontSize: "12", fontFamily: 3, fontWeight: 700, fontStyle: true },
				{ fontSize: 24 },
			),
		).toEqual({
			fontSize: 24,
			fontFamily: DEFAULT_FONT_FAMILY,
			fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
			fontStyle: undefined,
		});
	});
});
