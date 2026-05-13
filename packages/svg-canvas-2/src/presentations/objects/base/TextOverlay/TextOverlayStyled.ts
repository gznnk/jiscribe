import styled from "@emotion/styled";

import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

const VerticalAlignMap: Record<
	VerticalAlign,
	React.CSSProperties["alignItems"]
> = {
	top: "flex-start",
	middle: "center",
	bottom: "flex-end",
} as const;

const TextAlignMap: Record<TextAlign, React.CSSProperties["textAlign"]> = {
	left: "left",
	center: "center",
	right: "right",
} as const;

type TextWrapperProps = {
	verticalAlign: VerticalAlign;
};

export const TextWrapper = styled.div<TextWrapperProps>`
	display: flex;
	width: 100%;
	height: 100%;
	overflow: hidden;
	align-items: ${(props) => VerticalAlignMap[props.verticalAlign]};
`;

type TextProps = {
	textAlign: TextAlign;
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
	wordBreak: string;
	whiteSpace: string;
};

export const Text = styled.div<TextProps>`
	width: 100%;
	text-align: ${(props) => TextAlignMap[props.textAlign]};
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	border: none;
	outline: none;
	background: transparent;
	pointer-events: none;
	user-select: none;
	overflow: hidden;
	word-break: ${(props) => props.wordBreak};
	white-space: ${(props) => props.whiteSpace};
	padding: 2px 6px;
	box-sizing: border-box;

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
	h1:first-child,
	h2:first-child,
	h3:first-child,
	h4:first-child,
	h5:first-child,
	h6:first-child {
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

export const ForeignObjectElement = styled.foreignObject`
	opacity: 1;
`;
