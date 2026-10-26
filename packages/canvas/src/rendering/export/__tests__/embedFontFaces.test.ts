import { describe, expect, it } from "vitest";

import {
	buildFontFaceCss,
	buildFontFaceKey,
	canonicalizeUnicodeRange,
	parseFontFaceSources,
	parseUnicodeRanges,
	pickFontFaceSource,
} from "../embedFontFaces";

describe("parseUnicodeRanges", () => {
	it("reads single code points and hyphenated ranges", () => {
		expect(parseUnicodeRanges("U+0301, U+0400-045F")).toEqual([
			[0x301, 0x301],
			[0x400, 0x45f],
		]);
	});

	it("expands the wildcard form to the range it stands for", () => {
		expect(parseUnicodeRanges("U+4??")).toEqual([[0x400, 0x4ff]]);
	});

	it("treats a missing declaration as the whole of Unicode", () => {
		expect(parseUnicodeRanges("")).toEqual([[0, 0x10ffff]]);
		expect(parseUnicodeRanges("   ")).toEqual([[0, 0x10ffff]]);
	});

	it("drops entries it cannot read rather than covering everything", () => {
		expect(parseUnicodeRanges("U+0-7F, nonsense")).toEqual([[0, 0x7f]]);
	});
});

describe("canonicalizeUnicodeRange", () => {
	it("pairs the stylesheet spelling with the FontFace one", () => {
		// The CSSOM keeps the leading zeros the sheet wrote; FontFace.unicodeRange
		// drops them, and the two must still land on the same key.
		expect(canonicalizeUnicodeRange("U+0460-052F, U+1C80-1C8A")).toBe(
			canonicalizeUnicodeRange("U+460-52F, U+1C80-1C8A"),
		);
	});

	it("ignores the order the ranges were declared in", () => {
		expect(canonicalizeUnicodeRange("U+1C80-1C8A, U+0460-052F")).toBe(
			canonicalizeUnicodeRange("U+0460-052F, U+1C80-1C8A"),
		);
	});

	it("separates ranges that cover different code points", () => {
		expect(canonicalizeUnicodeRange("U+0-7F")).not.toBe(
			canonicalizeUnicodeRange("U+0-FF"),
		);
	});
});

describe("buildFontFaceKey", () => {
	it("matches a rule against the FontFace the browser built from it", () => {
		const fromRule = buildFontFaceKey(
			'"Source Sans 3"',
			"400",
			"normal",
			"U+0000-00FF",
		);
		const fromFontFace = buildFontFaceKey(
			"Source Sans 3",
			"400",
			"normal",
			"U+0-FF",
		);
		expect(fromRule).toBe(fromFontFace);
	});

	it("keeps weights and styles of the same family apart", () => {
		expect(buildFontFaceKey("Caveat", "400", "normal", "U+0-7F")).not.toBe(
			buildFontFaceKey("Caveat", "700", "normal", "U+0-7F"),
		);
		expect(buildFontFaceKey("Caveat", "400", "normal", "U+0-7F")).not.toBe(
			buildFontFaceKey("Caveat", "400", "italic", "U+0-7F"),
		);
	});

	it("treats an absent unicode-range as the full range", () => {
		expect(buildFontFaceKey("Caveat", "400", "normal", "")).toBe(
			buildFontFaceKey("Caveat", "400", "normal", "U+0-10FFFF"),
		);
	});
});

describe("parseFontFaceSources", () => {
	const FONTSOURCE_SRC =
		`url("./files/source-sans-3-latin-400-normal.woff2") format("woff2"), ` +
		`url("./files/source-sans-3-latin-400-normal.woff") format("woff")`;

	it("reads every url() entry with its format", () => {
		expect(parseFontFaceSources(FONTSOURCE_SRC)).toEqual([
			{ url: "./files/source-sans-3-latin-400-normal.woff2", format: "woff2" },
			{ url: "./files/source-sans-3-latin-400-normal.woff", format: "woff" },
		]);
	});

	it("accepts unquoted urls and single quotes", () => {
		expect(
			parseFontFaceSources("url(/assets/a.woff2) format('woff2')"),
		).toEqual([{ url: "/assets/a.woff2", format: "woff2" }]);
	});

	it("derives the format from the extension when the entry carries none", () => {
		expect(parseFontFaceSources("url(/assets/a.woff2)")).toEqual([
			{ url: "/assets/a.woff2", format: "woff2" },
		]);
		expect(parseFontFaceSources("url(/assets/a.ttf)")).toEqual([
			{ url: "/assets/a.ttf", format: "truetype" },
		]);
	});

	it("skips local() entries, which name a face on the host", () => {
		expect(
			parseFontFaceSources('local("Source Sans 3"), url(/assets/a.woff2)'),
		).toEqual([{ url: "/assets/a.woff2", format: "woff2" }]);
	});

	it("returns nothing for a descriptor naming no file", () => {
		expect(parseFontFaceSources('local("Source Sans 3")')).toEqual([]);
	});
});

describe("pickFontFaceSource", () => {
	it("prefers woff2 over the entries declared before it", () => {
		expect(
			pickFontFaceSource(
				"url(/assets/a.woff) format('woff'), url(/assets/a.woff2) format('woff2')",
			),
		).toEqual({ url: "/assets/a.woff2", format: "woff2" });
	});

	it("falls back to the first entry when no woff2 is offered", () => {
		expect(pickFontFaceSource("url(/assets/a.ttf) format('truetype')")).toEqual(
			{
				url: "/assets/a.ttf",
				format: "truetype",
			},
		);
	});

	it("returns null for a descriptor naming no file", () => {
		expect(pickFontFaceSource('local("Source Sans 3")')).toBeNull();
	});
});

describe("buildFontFaceCss", () => {
	const FACE = {
		family: '"Source Sans 3"',
		weight: "400",
		style: "normal",
		unicodeRange: "U+0000-00FF",
		dataUri: "data:font/woff2;base64,AAAA",
		format: "woff2",
	};

	it("writes a rule carrying the bytes and the range it covers", () => {
		expect(buildFontFaceCss([FACE])).toBe(
			'@font-face{font-family:"Source Sans 3";font-style:normal;' +
				"font-weight:400;font-display:block;" +
				'src:url(data:font/woff2;base64,AAAA) format("woff2");' +
				"unicode-range:U+0000-00FF;}",
		);
	});

	it("forces font-display:block so no swap period paints the fallback", () => {
		expect(buildFontFaceCss([FACE])).toContain("font-display:block;");
	});

	it("omits unicode-range for a face that declared none", () => {
		expect(buildFontFaceCss([{ ...FACE, unicodeRange: "" }])).not.toContain(
			"unicode-range",
		);
	});

	it("omits the format hint when the source carried none", () => {
		expect(buildFontFaceCss([{ ...FACE, format: "" }])).toContain(
			"src:url(data:font/woff2;base64,AAAA);",
		);
	});

	it("emits one rule per face", () => {
		expect(
			buildFontFaceCss([FACE, { ...FACE, weight: "700" }]).split("\n"),
		).toHaveLength(2);
	});

	it("produces nothing for an empty list", () => {
		expect(buildFontFaceCss([])).toBe("");
	});

	it("stays free of characters XML serialization would escape", () => {
		expect(buildFontFaceCss([FACE])).not.toMatch(/[<>&]/);
	});
});
