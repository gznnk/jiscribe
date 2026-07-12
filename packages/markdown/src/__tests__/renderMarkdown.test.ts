import { describe, it, expect } from "vitest";

import { renderMarkdown } from "../index";

// renderMarkdown は「markdown-it（html:false）でパース → DOMPurify でサニタイズ」の
// 2 層で XSS を防ぐ。ここでは公開契約（サニタイズ設定・リンク属性・数式・整形）が
// 回帰しないことを end-to-end で固定する。DOM 環境は vitest.config.ts の jsdom。

describe("renderMarkdown - サニタイズ（html:false + DOMPurify）", () => {
	it("生の <script> はエスケープされ、実タグとして出力されない", () => {
		const html = renderMarkdown("<script>alert(1)</script>");
		expect(html).not.toContain("<script");
		expect(html).toContain("&lt;script&gt;");
	});

	it("生の <img onerror> は実タグにならない（属性が発火しない）", () => {
		const html = renderMarkdown("<img src=x onerror=alert(1)>");
		// エスケープ後は "onerror" が文字列として残るため、実タグの有無で判定する
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});

	it("コードフェンス内の HTML はエスケープされる", () => {
		const html = renderMarkdown("```\nplain <b>bold</b>\n```");
		expect(html).toContain("&lt;b&gt;");
		expect(html).not.toContain("<b>");
	});
});

describe("renderMarkdown - リンク", () => {
	it("リンクに target=_blank と rel が付与され、サニタイズを通過する", () => {
		const html = renderMarkdown("[link](https://example.com)");
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it("javascript: スキームはリンク化されない（アンカーを生成しない）", () => {
		const html = renderMarkdown("[x](javascript:alert(1))");
		expect(html).not.toMatch(/<a\b/);
	});

	it("linkify で生の URL がリンク化され、同じ属性が付く", () => {
		const html = renderMarkdown("Visit https://example.com now");
		expect(html).toContain('<a href="https://example.com"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});
});

describe("renderMarkdown - 数式（KaTeX / normalizeMath）", () => {
	it("$...$ はインライン数式としてレンダリングされる", () => {
		const html = renderMarkdown("$a+b$");
		expect(html).toContain('class="katex"');
		expect(html).toContain("<math");
	});

	it("$$...$$ はブロック数式（math-block）としてレンダリングされる", () => {
		const html = renderMarkdown("$$\na+b\n$$");
		expect(html).toContain('class="math-block"');
		expect(html).toContain("katex-display");
	});

	it("\\(...\\) は normalizeMath でインライン数式に変換される", () => {
		const html = renderMarkdown("\\(x\\)");
		expect(html).toContain('class="katex"');
		expect(html).not.toContain('class="math-block"');
	});

	it("\\[...\\] は normalizeMath でブロック数式に変換される", () => {
		const html = renderMarkdown("\\[y\\]");
		expect(html).toContain('class="math-block"');
	});
});

describe("renderMarkdown - 基本整形", () => {
	it("見出しをレンダリングする", () => {
		expect(renderMarkdown("# Title")).toContain("<h1>Title</h1>");
	});

	it("強調をレンダリングする", () => {
		expect(renderMarkdown("**x**")).toContain("<strong>x</strong>");
	});

	it("breaks: true により単一改行が <br> になる", () => {
		expect(renderMarkdown("a\nb")).toContain("<br>");
	});

	it("言語指定のコードフェンスは highlight.js のクラスが付く", () => {
		const html = renderMarkdown("```js\nconst a = 1;\n```");
		expect(html).toContain('class="hljs language-js"');
		expect(html).toContain("hljs-keyword");
	});

	it("言語指定なしのコードフェンスはクラスなしの pre/code になる", () => {
		const html = renderMarkdown("```\nplain\n```");
		expect(html).toContain("<pre><code>");
	});
});
