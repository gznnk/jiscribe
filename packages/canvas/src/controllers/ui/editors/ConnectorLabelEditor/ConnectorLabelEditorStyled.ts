import styled from "@emotion/styled";

import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../../../constants/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

/**
 * Wrapper centered on the anchor (the label position along the route).
 * The width is given as a measured value and centered via translate(-50%, -50%);
 * the height follows its content.
 * Background and border match the display-side LabelBox so the appearance stays
 * consistent while editing.
 *
 * Per-instance values (left / top / width / background / border) change per
 * keystroke via text measurement, so they are passed via the `style` prop
 * instead of emotion interpolation (see #131).
 */
export const ConnectorLabelEditorWrapper = styled.div`
	position: absolute;
	box-sizing: border-box;
	transform: translate(-50%, -50%);
	border-radius: 2px;
	pointer-events: auto;
`;

/**
 * Textarea for editing the connector label, styled to match the displayed label
 * text (font, size, alignment, and line wrapping) with a transparent background.
 *
 * Per-instance text styles (color / font-size / font-family / font-weight) are
 * passed via the `style` prop (see #131).
 */
export const ConnectorLabelTextArea = styled.textarea`
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: ${TEXT_BOX_PADDING_Y}px ${TEXT_BOX_PADDING_X}px;
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
