import { describe, expect, it, vi } from "vitest";

import { theme } from "../../../../foundation/theme/themeTokens";
import { resolveDocumentSurface } from "../resolveDocumentSurface";

// Node has no canvas; stand in for the browser's serialization so only the
// surface rule is under test here (isOpaqueCssColor.test covers the opacity rule).
const BROWSER_SPELLINGS: Record<string, string> = {
	"#0b1220": "#0b1220",
	transparent: "rgba(0, 0, 0, 0)",
	"rgba(220, 38, 38, 0.5)": "rgba(220, 38, 38, 0.5)",
};

vi.mock("../../../../foundation/color/normalizeCssColor", () => ({
	normalizeCssColor: (color: string) => BROWSER_SPELLINGS[color] ?? null,
}));

describe("resolveDocumentSurface", () => {
	it("is an opaque background itself", () => {
		expect(resolveDocumentSurface("#0b1220")).toBe("#0b1220");
	});

	it("is the theme's canvas color when the document sets no background", () => {
		expect(resolveDocumentSurface(undefined)).toBe(theme.canvasBg);
	});

	it.each(["transparent", "rgba(220, 38, 38, 0.5)", "not-a-color"])(
		"is the theme's canvas color under %s, which is not opaque",
		(background) => {
			expect(resolveDocumentSurface(background)).toBe(theme.canvasBg);
		},
	);
});
