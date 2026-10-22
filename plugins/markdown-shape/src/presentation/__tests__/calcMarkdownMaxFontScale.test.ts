import { describe, expect, it } from "vitest";

import { calcMarkdownMaxFontScale } from "../calcMarkdownMaxFontScale";
import { MARKDOWN_HEADING_FONT_SCALES } from "../markdownHeadingFontScales";

// The inputs are what renderMarkdown emits for the source in each comment; it is
// not called here, since its sanitizer needs a DOM this package's tests run without.
describe("calcMarkdownMaxFontScale", () => {
	it("is 1 for a body with no heading, or none above body size", () => {
		expect(calcMarkdownMaxFontScale("")).toBe(1);
		// plain **text**
		expect(
			calcMarkdownMaxFontScale("<p>plain <strong>text</strong></p>\n"),
		).toBe(1);
		// ###### small
		expect(calcMarkdownMaxFontScale("<h6>small</h6>\n")).toBe(1);
	});

	it("is the scale of the largest heading present", () => {
		// ### three / ## two / body
		expect(
			calcMarkdownMaxFontScale("<h3>three</h3>\n<h2>two</h2>\n<p>body</p>\n"),
		).toBe(MARKDOWN_HEADING_FONT_SCALES.h2);
		// - # in a list
		expect(
			calcMarkdownMaxFontScale(
				"<ul>\n<li>\n<h1>in a list</h1>\n</li>\n</ul>\n",
			),
		).toBe(MARKDOWN_HEADING_FONT_SCALES.h1);
	});

	it("ignores heading markup the renderer escapes", () => {
		// <h1>raw</h1>
		expect(calcMarkdownMaxFontScale("<p>&lt;h1&gt;raw&lt;/h1&gt;</p>\n")).toBe(
			1,
		);
	});
});
