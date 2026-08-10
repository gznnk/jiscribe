import DOMPurify from "dompurify";
import katex from "katex";
// The default export is a callable wrapper around the class; the class itself is
// only reachable as a named type export.
import MarkdownIt, { type MarkdownIt as MarkdownItInstance } from "markdown-it";

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
const katexLite = (md: MarkdownItInstance): void => {
	/**
	 * Inline math handler ($...$)
	 * Processes inline math expressions surrounded by single dollar signs
	 */
	md.inline.ruler.after("escape", "math_inline", (state, silent) => {
		const start = state.pos;
		if (state.src[start] !== "$") {
			return false;
		}

		let match = start + 1;
		match = state.src.indexOf("$", match);
		while (match !== -1) {
			// Ignore escaped \$ or empty
			if (state.src[match - 1] === "\\" || match === start + 1) {
				match++;
				continue;
			}
			const content = state.src.slice(start + 1, match);
			if (content.includes("\n")) {
				return false;
			}
			if (silent) {
				return true;
			}

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
			if (state.src.slice(begin, begin + 2) !== "$$") {
				return false;
			}

			// Find the closing $$ on a subsequent line
			let next = startLine;
			while (++next < endLine) {
				const pos = state.bMarks[next] + state.tShift[next];
				if (state.src.slice(pos, pos + 2) === "$$") {
					break;
				}
			}

			// Reject if no closing $$ is found
			if (next >= endLine) {
				return false;
			}
			if (silent) {
				return true;
			}

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
 * Stamps a fixed set of attributes onto every rendered link.
 *
 * This is what markdown-it-link-attributes did, inlined: that package ships no types
 * of its own and DefinitelyTyped never published a v4 stub, so its only typing was a
 * v3 stub written against markdown-it 14's type shape.
 *
 * @param md - The markdown-it instance to extend
 * @param attrs - Attribute name/value pairs applied to every `<a>`; an attribute already
 *   present on the link is overwritten
 */
const linkAttributes = (
	md: MarkdownItInstance,
	attrs: Record<string, string>,
): void => {
	const defaultRender = md.renderer.rules.link_open;
	md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		for (const [name, value] of Object.entries(attrs)) {
			tokens[idx].attrSet(name, value);
		}
		return defaultRender
			? defaultRender(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options);
	};
};

/**
 * Create and configure the markdown-it instance with plugins and options.
 * Includes math rendering and link attribute handling.
 *
 * Code fences are left to markdown-it's default renderer, which emits
 * `<pre><code class="language-xxx">` with the source escaped. Syntax
 * highlighting is deliberately absent: the shape's colors follow the theme and
 * the per-object font color via `currentColor`, which a highlighter's fixed
 * palette cannot follow, and image export flattens the body to plain text.
 */
const md = new MarkdownIt({
	// Disable raw HTML in source as defense-in-depth against XSS: user-typed
	// HTML tags are escaped to literal text instead of relying solely on
	// DOMPurify (which may have known mXSS bypasses). Math (KaTeX) emits HTML
	// via renderer rules, so it is unaffected.
	html: false,
	breaks: true, // Convert '\n' in paragraphs into <br>
	linkify: true, // Autoconvert URL-like text to links
})
	// Apply the custom KaTeX plugin
	.use(katexLite)
	// Configure all links to open in new tab with security attributes
	.use(linkAttributes, {
		target: "_blank",
		rel: "noopener noreferrer",
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
