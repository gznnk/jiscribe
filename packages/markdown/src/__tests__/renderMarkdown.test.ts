import { describe, it, expect } from "vitest";

import { renderMarkdown } from "../index";

// renderMarkdown prevents XSS in two layers: parse with markdown-it (html:false),
// then sanitize with DOMPurify. These tests pin the public contract (sanitizer
// settings, link attributes, math, formatting) end to end so it cannot regress.
// The DOM environment is jsdom, configured in vitest.config.ts.

describe("renderMarkdown - sanitizing (html:false + DOMPurify)", () => {
	it("escapes a raw <script> instead of emitting a real tag", () => {
		const html = renderMarkdown("<script>alert(1)</script>");
		expect(html).not.toContain("<script");
		expect(html).toContain("&lt;script&gt;");
	});

	it("does not turn a raw <img onerror> into a real tag (the attribute never fires)", () => {
		const html = renderMarkdown("<img src=x onerror=alert(1)>");
		// "onerror" survives as text after escaping, so assert on the real tag instead
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});

	it("escapes HTML inside a code fence", () => {
		const html = renderMarkdown("```\nplain <b>bold</b>\n```");
		expect(html).toContain("&lt;b&gt;");
		expect(html).not.toContain("<b>");
	});
});

describe("renderMarkdown - links", () => {
	it("adds target=_blank and rel to links, and they survive sanitizing", () => {
		const html = renderMarkdown("[link](https://example.com)");
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it("does not linkify the javascript: scheme (no anchor is produced)", () => {
		const html = renderMarkdown("[x](javascript:alert(1))");
		expect(html).not.toMatch(/<a\b/);
	});

	it("linkifies a bare URL and gives it the same attributes", () => {
		const html = renderMarkdown("Visit https://example.com now");
		expect(html).toContain('<a href="https://example.com"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});
});

describe("renderMarkdown - math (KaTeX / normalizeMath)", () => {
	it("renders $...$ as inline math", () => {
		const html = renderMarkdown("$a+b$");
		expect(html).toContain('class="katex"');
		expect(html).toContain("<math");
	});

	it("renders $$...$$ as block math (math-block)", () => {
		const html = renderMarkdown("$$\na+b\n$$");
		expect(html).toContain('class="math-block"');
		expect(html).toContain("katex-display");
	});

	it("converts \\(...\\) to inline math via normalizeMath", () => {
		const html = renderMarkdown("\\(x\\)");
		expect(html).toContain('class="katex"');
		expect(html).not.toContain('class="math-block"');
	});

	it("converts \\[...\\] to block math via normalizeMath", () => {
		const html = renderMarkdown("\\[y\\]");
		expect(html).toContain('class="math-block"');
	});
});

describe("renderMarkdown - basic formatting", () => {
	it("renders headings", () => {
		expect(renderMarkdown("# Title")).toContain("<h1>Title</h1>");
	});

	it("renders emphasis", () => {
		expect(renderMarkdown("**x**")).toContain("<strong>x</strong>");
	});

	it("turns a single newline into <br> because breaks: true is set", () => {
		expect(renderMarkdown("a\nb")).toContain("<br>");
	});

	it("gives a language-tagged code fence a language- class without highlighting it", () => {
		const html = renderMarkdown("```js\nconst a = 1;\n```");
		expect(html).toContain('class="language-js"');
		expect(html).not.toContain("hljs");
	});

	it("renders a code fence without a language as plain pre/code", () => {
		const html = renderMarkdown("```\nplain\n```");
		expect(html).toContain("<pre><code>");
	});
});
