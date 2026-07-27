import styled from "@emotion/styled";

import {
	CONNECTOR_LABEL_PADDING_X,
	CONNECTOR_LABEL_PADDING_Y,
} from "./utils/connectorLabelLayout";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

/**
 * The label body. Drawn horizontally over the line, with a background (knockout)
 * that hides the line to preserve readability. Dimensions based on text amount
 * are provided by the foreignObject, so here it expands to fill its content box.
 *
 * Per-instance values (background / border / color / font styles) are passed
 * via the `style` prop instead of emotion interpolation (see #131).
 */
export const LabelBox = styled.div`
	display: flex;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding: ${CONNECTOR_LABEL_PADDING_Y}px ${CONNECTOR_LABEL_PADDING_X}px;
	border-radius: 2px;
	line-height: ${TEXT_LINE_HEIGHT};
	text-align: center;
	white-space: pre-wrap;
	word-break: break-word;
	user-select: none;
	/* The box itself is the drag handle for label.position / label.offset. */
	cursor: move;
`;
