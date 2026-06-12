import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../constants/scrollbarStyles";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

const VerticalAlignMap: Record<
	VerticalAlign,
	React.CSSProperties["alignItems"]
> = {
	top: "flex-start",
	middle: "center",
	bottom: "flex-end",
} as const;

/**
 * Props for the text editor element.
 */
type TextEditorStyledProps = {
	left: number;
	top: number;
	transform: string;
	width: number;
	height: number;
	textAlign: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

/**
 * Props for the wrapper that positions the editor and applies vertical alignment.
 */
type TextEditorWrapperProps = {
	left: number;
	top: number;
	transform: string;
	width: number;
	height: number;
	verticalAlign: VerticalAlign;
};

/**
 * Wrapper that carries the shape's position/transform and aligns the
 * textarea vertically, mirroring TextOverlay's TextWrapper.
 */
export const TextEditorWrapper = styled.div<TextEditorWrapperProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: ${(props) => props.transform};
	width: ${(props) => props.width}px;
	height: ${(props) => props.height}px;
	display: flex;
	align-items: ${(props) => VerticalAlignMap[props.verticalAlign]};
	overflow: hidden;
	pointer-events: auto;
`;

/**
 * Styled input element for the text editor (single line).
 */
export const Input = styled.input<TextEditorStyledProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: ${(props) => props.transform};
	width: ${(props) => props.width}px;
	height: ${(props) => props.height}px;
	text-align: ${(props) => props.textAlign};
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	background: transparent;
	border: none;
	outline: none;
	overflow: hidden;
	resize: none;
	box-sizing: border-box;
	padding: 2px 6px;
	pointer-events: auto;
	border-radius: 2px;
`;

/**
 * Props for the multi-line textarea element.
 * Height is set inline by TextEditor to fit the content, so the wrapper's
 * vertical alignment takes effect.
 */
type TextAreaProps = {
	textAlign: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

/**
 * Styled textarea element for the text editor (multi-line).
 */
export const TextArea = styled.textarea<TextAreaProps>`
	width: 100%;
	max-height: 100%;
	text-align: ${(props) => props.textAlign};
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	background: transparent;
	border: none;
	outline: none;
	overflow-y: auto;
	${scrollbarStyles}
	resize: none;
	box-sizing: border-box;
	padding: 2px 6px;
	pointer-events: auto;
	border-radius: 2px;
`;
