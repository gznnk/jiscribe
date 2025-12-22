import styled from "@emotion/styled";

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
	verticalAlign: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

/**
 * Styled input element for the text editor.
 */
export const Input = styled.input<TextEditorStyledProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: ${(props) => props.transform};
	width: ${(props) => props.width}px;
	height: ${(props) => props.height}px;
	text-align: ${(props) => props.textAlign};
	vertical-align: ${(props) => props.verticalAlign};
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
`;

/**
 * Styled textarea element for the text editor.
 */
export const TextArea = styled.textarea<TextEditorStyledProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: ${(props) => props.transform};
	width: ${(props) => props.width}px;
	height: ${(props) => props.height}px;
	text-align: ${(props) => props.textAlign};
	vertical-align: ${(props) => props.verticalAlign};
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	background: transparent;
	border: none;
	outline: none;
	overflow-y: auto;
	resize: none;
	box-sizing: border-box;
	padding: 2px 6px;
	pointer-events: auto;
`;
