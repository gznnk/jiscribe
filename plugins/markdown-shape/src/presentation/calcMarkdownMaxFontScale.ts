import { MARKDOWN_HEADING_FONT_SCALES } from "./markdownHeadingFontScales";

/**
 * The heading tags in rendered Markdown. Read off the HTML rather than the
 * source, so a setext heading counts while a `#` line in a code fence, or an
 * `<h1>` typed into the source, does not: the renderer escapes both.
 */
const HEADING_TAG_PATTERN = /<(h[1-6])[\s>]/g;

/**
 * The largest size the rendered body draws at, as a multiple of the shape's
 * `fontSize`: the scale of the largest heading in it, never below 1 since the
 * rest of the body is drawn at `fontSize` itself.
 *
 * @param renderedHtml - The body as `renderMarkdown` renders it; "" yields 1
 */
export const calcMarkdownMaxFontScale = (renderedHtml: string): number => {
	let maxFontScale = 1;
	for (const match of renderedHtml.matchAll(HEADING_TAG_PATTERN)) {
		const headingTag = match[1] as keyof typeof MARKDOWN_HEADING_FONT_SCALES;
		maxFontScale = Math.max(
			maxFontScale,
			MARKDOWN_HEADING_FONT_SCALES[headingTag],
		);
	}
	return maxFontScale;
};
