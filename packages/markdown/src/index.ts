import DOMPurify from "dompurify";
import hljs from "highlight.js";
import katex from "katex";
import MarkdownIt from "markdown-it";
import linkAttr from "markdown-it-link-attributes";

// CSS imports for external libraries
import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";

/**
 * Normalizes mathematical notation in markdown text.
 * Converts LaTeX-style math delimiters to format compatible with markdown-it.
 *
 * @param text - The original markdown text with math expressions
 * @returns Normalized text with math expressions properly formatted
 */
const normalizeMath = (text: string): string => {
	return (
		text
			// Convert \[...\] to block math
			.replace(/\\\[(.*?)\\\]/gs, (_, inner) => `\n$$\n${inner}\n$$\n`)
			// Convert \(...\) to inline math
			.replace(/\\\((.+?)\\\)/gs, (_, inner) => `$${inner}$`)
			// Ensure $$...$$ is on its own line
			.replace(/\$\$([^$\n]+?)\$\$/gs, (_, inner) => `\n$$\n${inner}\n$$\n`)
	);
};

/**
 * Lightweight KaTeX plugin for markdown-it.
 * Implements both inline math ($...$) and block math ($$...$$) rendering
 * without requiring the full markdown-it-katex plugin.
 *
 * @param md - The markdown-it instance to extend
 */
const katexLite = (md: MarkdownIt): void => {
	/**
	 * Inline math handler ($...$)
	 * Processes inline math expressions surrounded by single dollar signs
	 */
	md.inline.ruler.after("escape", "math_inline", (state, silent) => {
		const start = state.pos;
		if (state.src[start] !== "$") return false;

		let match = start + 1;
		match = state.src.indexOf("$", match);
		while (match !== -1) {
			// Ignore escaped \$ or empty
			if (state.src[match - 1] === "\\" || match === start + 1) {
				match++;
				continue;
			}
			const content = state.src.slice(start + 1, match);
			if (content.includes("\n")) return false;
			if (silent) return true;

			const token = state.push("math_inline", "", 0);
			token.content = content;
			state.pos = match + 1;
			return true;
		}
		return false;
	});

	/**
	 * Block math handler ($$...$$)
	 * Processes block math expressions surrounded by double dollar signs
	 * Must be on separate lines
	 */
	md.block.ruler.after(
		"fence",
		"math_block",
		(state, startLine, endLine, silent) => {
			// Check if the line starts with $$
			const begin = state.bMarks[startLine] + state.tShift[startLine];
			if (state.src.slice(begin, begin + 2) !== "$$") return false;

			// Find the closing $$ on a subsequent line
			let next = startLine;
			while (++next < endLine) {
				const pos = state.bMarks[next] + state.tShift[next];
				if (state.src.slice(pos, pos + 2) === "$$") break;
			}

			// Reject if no closing $$ is found
			if (next >= endLine) return false;
			if (silent) return true;

			// Create a token for the block math expression
			const token = state.push("math_block", "", 0);

			// Extract content from first line
			const firstLine = state.src
				.slice(begin + 2, state.eMarks[startLine])
				.trim();

			// Extract content from last line
			const lastLine = state.src
				.slice(state.bMarks[next] + state.tShift[next] + 2, state.eMarks[next])
				.trim();

			// Combine all lines into the token content
			token.content = `${firstLine ? `${firstLine}\n` : ""}${state.getLines(startLine + 1, next, state.tShift[startLine], true)}${lastLine || ""}`;
			token.map = [startLine, next + 1];
			state.line = next + 1;
			return true;
		},
		// Alternative blocks that this rule can interrupt
		{ alt: ["paragraph", "reference", "blockquote", "list"] },
	);

	/* Renderers for math expressions */

	// Inline math renderer - uses KaTeX to render inline expressions
	md.renderer.rules.math_inline = (t, i) =>
		katex.renderToString(t[i].content, { throwOnError: false });

	// Block math renderer - uses KaTeX with displayMode for block expressions
	md.renderer.rules.math_block = (t, i) =>
		`<div class="math-block">${katex.renderToString(t[i].content, {
			displayMode: true,
			throwOnError: false,
		})}</div>`;
};

/**
 * Create and configure the markdown-it instance with plugins and options.
 * Includes syntax highlighting, math rendering, and link attribute handling.
 */
const md = new MarkdownIt({
	html: true, // Enable HTML tags in source
	breaks: true, // Convert '\n' in paragraphs into <br>
	linkify: true, // Autoconvert URL-like text to links

	// Custom syntax highlighting using highlight.js
	highlight: (str: string, lang: string): string => {
		if (lang && hljs.getLanguage(lang)) {
			return `<pre><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
		}
		return `<pre><code>${md.utils.escapeHtml(str)}</code></pre>`;
	},
})
	// Apply the custom KaTeX plugin
	.use(katexLite)
	// Configure all links to open in new tab with security attributes
	.use(linkAttr, {
		// No matcher specified - applies to all links
		attrs: {
			target: "_blank",
			rel: "noopener noreferrer",
		},
	});

/**
 * Renders markdown text to HTML with math support and sanitization.
 * Uses a custom KaTeX implementation and preserves target/rel attributes.
 *
 * @param text - The markdown text to render
 * @returns Sanitized HTML string with rendered markdown content
 */
export const renderMarkdown = (text: string): string => {
	// Configure sanitization to preserve link attributes
	const sanitizeConfig = {
		ADD_ATTR: ["target", "rel"],
	};

	// First render markdown to HTML, then sanitize the result
	const html = md.render(normalizeMath(text));

	// Apply sanitization with scoped configuration
	return DOMPurify.sanitize(html, sanitizeConfig);
};
