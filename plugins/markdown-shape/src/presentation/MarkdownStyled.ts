import styled from "@emotion/styled";

type MarkdownCardProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/** The card the rendered Markdown sits on. Same interaction affordances as a Rect. */
export const MarkdownCard = styled.rect<MarkdownCardProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * Rendered-Markdown body, drawn inside canvas's TextOverlayFrame.
 *
 * `white-space` / `word-break` are reset from the frame's plain-text defaults
 * because this subtree lays itself out as HTML blocks. Sizes are relative (`em`)
 * so the whole document scales with the shape's `fontSize`.
 */
export const MarkdownBody = styled.div`
	width: 100%;
	white-space: normal;
	word-break: normal;

	p {
		margin: 0.5em 0;
	}
	p:first-of-type {
		margin-top: 0;
	}
	p:last-of-type {
		margin-bottom: 0;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 0.5em 0 0.25em;
		font-weight: bold;
		line-height: 1.3;
		color: currentColor;
	}
	h1:first-of-type,
	h2:first-of-type,
	h3:first-of-type,
	h4:first-of-type,
	h5:first-of-type,
	h6:first-of-type {
		margin-top: 0;
	}
	h1 {
		font-size: 1.6em;
	}
	h2 {
		font-size: 1.35em;
	}
	h3 {
		font-size: 1.15em;
	}
	h4 {
		font-size: 1em;
	}
	h5 {
		font-size: 0.9em;
	}
	h6 {
		font-size: 0.8em;
		opacity: 0.75;
	}

	ul,
	ol {
		margin: 0.3em 0;
		padding-left: 1.4em;
	}
	li {
		margin: 0.1em 0;
	}
	li > ul,
	li > ol {
		margin: 0;
	}

	blockquote {
		margin: 0.4em 0;
		padding: 0.15em 0.75em;
		border-left: 3px solid color-mix(in srgb, currentColor 40%, transparent);
		opacity: 0.8;
	}

	hr {
		border: none;
		border-top: 1px solid color-mix(in srgb, currentColor 30%, transparent);
		margin: 0.6em 0;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		margin: 0.4em 0;
		font-size: 0.9em;
	}
	th,
	td {
		border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
		padding: 0.25em 0.5em;
		text-align: left;
	}
	th {
		background: color-mix(in srgb, currentColor 10%, transparent);
		font-weight: bold;
	}

	& a {
		color: currentColor;
		opacity: 0.75;
		text-decoration: underline;
		pointer-events: auto;
		transition: opacity 0.2s ease;
	}
	& a:hover {
		opacity: 1;
	}

	pre {
		background: color-mix(in srgb, currentColor 10%, transparent);
		border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
		padding: 0.5em 0.75em;
		border-radius: 4px;
		overflow-x: hidden;
		margin: 0.4em 0;

		& > code {
			background: transparent;
			border: none;
			padding: 0;
			margin: 0;
			border-radius: 0;
			font-size: inherit;
			overflow-x: hidden;
		}
	}

	code {
		font-family: "Courier New", monospace;
		background: color-mix(in srgb, currentColor 12%, transparent);
		padding: 1px 4px;
		border-radius: 3px;
		margin: 0 0.2em;
		font-size: 0.9em;
	}
`;
