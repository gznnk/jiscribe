/**
 * Font size of each heading level, in `em` of the shape's `fontSize`. Read by
 * the body's styles (MarkdownBody) and by the overlay, which tells the frame the
 * largest size the body draws at (calcMarkdownMaxFontScale).
 */
export const MARKDOWN_HEADING_FONT_SCALES = {
	h1: 1.6,
	h2: 1.35,
	h3: 1.15,
	h4: 1,
	h5: 0.9,
	h6: 0.8,
} as const;
