import styled from "@emotion/styled";

import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

const VerticalAlignMap: Record<
	VerticalAlign,
	React.CSSProperties["alignItems"]
> = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
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

	& a {
		color: #4ea1ff;
		pointer-events: auto;
		transition: color 0.2s ease;
	}
	& a:hover {
		color: #72b8ff;
	}

	pre {
		background-color: #141825;
		padding: 0;
		border-radius: 4px;
		overflow-x: auto;

		& > code {
			background-color: #141825;
			border: 1px solid rgba(0, 0, 0, 0.15);
			margin: 0;
		}
	}

	code {
		font-family: "Courier New", monospace;
		background-color: #141825;
		padding: 1px 4px 1px 4px;
		border-radius: 3px;
		margin: 0 0.2em;
	}
`;

export const ForeignObjectElement = styled.foreignObject`
	opacity: 1;
`;
