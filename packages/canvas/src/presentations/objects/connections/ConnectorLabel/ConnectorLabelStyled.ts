import styled from "@emotion/styled";

import {
	CONNECTOR_LABEL_PADDING_X,
	CONNECTOR_LABEL_PADDING_Y,
} from "./utils/connectorLabelLayout";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

type LabelBoxProps = {
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
	/** Resolved background color (omitted/auto uses the canvas background color). */
	background: string;
	/** Border width (0 means no border). */
	borderWidth: number;
	/** Resolved border color. */
	borderColor: string;
	/** Border style (CSS border-style: solid / dashed / dotted). */
	borderStyle: string;
};

/**
 * The label body. Drawn horizontally over the line, with a background (knockout)
 * that hides the line to preserve readability. Dimensions based on text amount
 * are provided by the foreignObject, so here it expands to fill its content box.
 */
export const LabelBox = styled.div<LabelBoxProps>`
	display: flex;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding: ${CONNECTOR_LABEL_PADDING_Y}px ${CONNECTOR_LABEL_PADDING_X}px;
	background: ${(props) => props.background};
	border: ${(props) =>
		props.borderWidth > 0
			? `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`
			: "none"};
	border-radius: 2px;
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	line-height: ${TEXT_LINE_HEIGHT};
	text-align: center;
	white-space: pre-wrap;
	word-break: break-word;
	user-select: none;
`;
