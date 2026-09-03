import { describe, expect, it } from "vitest";

import { dropLegacyFontSources } from "../generateFontsCss.ts";

describe("dropLegacyFontSources", () => {
	it("drops the woff beside a woff2", () => {
		const css =
			"@font-face { src: url(a.woff2) format('woff2'), url(a.woff) format('woff'); }";
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain("src: url(a.woff2) format('woff2');");
		expect(rewritten).not.toContain("a.woff)");
	});

	it("leaves a face with no woff2 untouched", () => {
		const woffOnly = "@font-face { src: url(a.woff) format('woff'); }";
		const ttfOnly = "@font-face { src: url(a.ttf) format('truetype'); }";
		expect(dropLegacyFontSources(woffOnly)).toBe(woffOnly);
		expect(dropLegacyFontSources(ttfOnly)).toBe(ttfOnly);
	});

	it("keeps the commas of a neighbouring unicode-range out of reach", () => {
		const css = `@font-face {
  src: url(a.woff2) format('woff2'), url(a.woff) format('woff');
  unicode-range: U+0000-00FF, U+0131, U+2000-206F;
}`;
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain(
			"unicode-range: U+0000-00FF, U+0131, U+2000-206F;",
		);
		expect(rewritten).not.toContain("a.woff)");
	});

	it("keeps only the woff2 of a woff2 + woff + ttf triple (the KaTeX shape)", () => {
		const css = `@font-face {
  src:
    url(a.woff2) format('woff2'),
    url(a.woff) format('woff'),
    url(a.ttf) format('truetype');
}`;
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain("src: url(a.woff2) format('woff2');");
		expect(rewritten).not.toContain("a.woff)");
		expect(rewritten).not.toContain("a.ttf");
	});

	it("reads woff2-variations as a woff2, so a variable font drops its legacy sibling", () => {
		const css =
			"@font-face { src: url(a.woff2) format('woff2-variations'), url(a.woff) format('woff'); }";
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain("url(a.woff2) format('woff2-variations')");
		expect(rewritten).not.toContain("a.woff)");
	});

	it("leaves a variable font that ships woff2-variations alone", () => {
		const css = "@font-face { src: url(a.woff2) format('woff2-variations'); }";
		expect(dropLegacyFontSources(css)).toBe(css);
	});

	it("rewrites every face in a stylesheet, not just the first", () => {
		const css = [
			"@font-face { src: url(a.woff2) format('woff2'), url(a.woff) format('woff'); }",
			"@font-face { src: url(b.woff2) format('woff2'), url(b.woff) format('woff'); }",
		].join("\n");
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).not.toContain("a.woff)");
		expect(rewritten).not.toContain("b.woff)");
	});
});
