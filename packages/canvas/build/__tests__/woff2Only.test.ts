import { describe, expect, it } from "vitest";

import { dropLegacyFontSources } from "../woff2Only";

describe("dropLegacyFontSources", () => {
	it("drops the woff of a face declared as woff2 + woff", () => {
		const css = `@font-face {
  font-family: 'Source Sans 3';
  src: url(./files/source-sans-3-latin-400-normal.woff2) format('woff2'), url(./files/source-sans-3-latin-400-normal.woff) format('woff');
}`;
		expect(dropLegacyFontSources(css)).toContain(
			"src: url(./files/source-sans-3-latin-400-normal.woff2) format('woff2');",
		);
		expect(dropLegacyFontSources(css)).not.toContain(".woff)");
	});

	it("leaves a face offering no woff2 untouched", () => {
		const woffOnly = `@font-face { src: url(a.woff) format('woff'); }`;
		const ttfOnly = `@font-face { src: url(a.ttf) format('truetype'); }`;
		const both = `@font-face { src: url(a.woff) format('woff'), url(a.ttf) format('truetype'); }`;
		expect(dropLegacyFontSources(woffOnly)).toBe(woffOnly);
		expect(dropLegacyFontSources(ttfOnly)).toBe(ttfOnly);
		expect(dropLegacyFontSources(both)).toBe(both);
	});

	it("leaves the commas of a neighbouring unicode-range alone", () => {
		const css = `@font-face {
  src: url(a.woff2) format('woff2'), url(a.woff) format('woff');
  unicode-range: U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF;
}`;
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain(
			"unicode-range: U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF;",
		);
		expect(rewritten).not.toContain("a.woff)");
	});

	it("keeps only the woff2 of a KaTeX face declared as woff2 + woff + ttf", () => {
		const css = `@font-face{font-family:KaTeX_AMS;font-style:normal;font-weight:400;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff"),url(fonts/KaTeX_AMS-Regular.ttf) format("truetype")}`;
		const rewritten = dropLegacyFontSources(css);
		expect(rewritten).toContain(
			'src: url(fonts/KaTeX_AMS-Regular.woff2) format("woff2")}',
		);
		expect(rewritten).not.toContain("KaTeX_AMS-Regular.woff)");
		expect(rewritten).not.toContain("KaTeX_AMS-Regular.ttf");
	});

	it("handles an src value broken across lines", () => {
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
		const css =
			"@font-face { src: url(a.woff2) format('woff2-variations'); }";
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
