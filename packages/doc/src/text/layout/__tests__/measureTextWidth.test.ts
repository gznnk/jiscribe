import { describe, expect, it } from "vitest";

import { measureTextWidth } from "../measureTextWidth";
import { FALLBACK_CHAR_WIDTH, FALLBACK_FONT } from "./support/fallbackFont";

describe("measureTextWidth", () => {
	it("falls back to a per-character estimate outside a browser", () => {
		expect(typeof document).toBe("undefined");
		expect(measureTextWidth("abc", FALLBACK_FONT)).toBe(
			3 * FALLBACK_CHAR_WIDTH,
		);
	});

	it("an empty string has no width", () => {
		expect(measureTextWidth("", FALLBACK_FONT)).toBe(0);
	});

	it("measures each run of a styled body under its own type size", () => {
		// "ab" at 10px (12px) plus "cd" at 20px (24px).
		expect(
			measureTextWidth(
				[{ text: "ab" }, { text: "cd", fontSize: 20 }],
				FALLBACK_FONT,
			),
		).toBe(2 * FALLBACK_CHAR_WIDTH + 2 * FALLBACK_CHAR_WIDTH * 2);
	});
});
