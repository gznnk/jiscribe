import styled from "@emotion/styled";

import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";
import {
	CONNECTOR_LABEL_PADDING_X,
	CONNECTOR_LABEL_PADDING_Y,
} from "../../../../presentations/objects/connections/ConnectorLabel/utils/connectorLabelLayout";

type WrapperProps = {
	left: number;
	top: number;
	width: number;
	background: string;
	borderWidth: number;
	borderColor: string;
	borderStyle: string;
};

/**
 * Wrapper centered on the anchor (the label position along the route).
 * The width is given as a measured value and centered via translate(-50%, -50%);
 * the height follows its content.
 * Background and border match the display-side LabelBox so the appearance stays
 * consistent while editing.
 */
export const ConnectorLabelEditorWrapper = styled.div<WrapperProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	width: ${(props) => props.width}px;
	box-sizing: border-box;
	transform: translate(-50%, -50%);
	background: ${(props) => props.background};
	border: ${(props) =>
		props.borderWidth > 0
			? `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`
			: "none"};
	border-radius: 2px;
	pointer-events: auto;
`;

type TextAreaProps = {
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

/**
 * Textarea for editing the connector label, styled to match the displayed label
 * text (font, size, alignment, and line wrapping) with a transparent background.
 */
export const ConnectorLabelTextArea = styled.textarea<TextAreaProps>`
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: ${CONNECTOR_LABEL_PADDING_Y}px ${CONNECTOR_LABEL_PADDING_X}px;
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	line-height: ${TEXT_LINE_HEIGHT};
	text-align: center;
	white-space: pre-wrap;
	word-break: break-word;
	background: transparent;
	border: none;
	outline: none;
	overflow: hidden;
	resize: none;
`;
