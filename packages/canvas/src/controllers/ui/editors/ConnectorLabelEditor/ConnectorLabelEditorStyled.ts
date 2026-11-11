import { css } from "@emotion/react";
import styled from "@emotion/styled";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/text/block/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/layout/textLineHeight";

import { LABEL_BOX_CORNER_RADIUS } from "../../../../rendering/objects/connector/ConnectorLabel/ConnectorLabelStyled";

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
/**
 * The custom property carrying the box's border width to the backdrop and the
 * redrawn border, which reach past the padding box by that much. Set inline by
 * ConnectorLabelEditor whenever `hasBackdrop` is, so it is read with no fallback.
 */
export const LABEL_EDITOR_BORDER_WIDTH_VAR =
	"--jiscribe-label-editor-border-width";

export const ConnectorLabelEditorWrapper = styled.div<{
	/**
	 * True while the box lies on a frame's backdrop (ConnectorLabelEditorBackdrop
	 * under the text): the border is drawn again over it, since what a box's
	 * children paint covers its own border. Reads the border width from
	 * LABEL_EDITOR_BORDER_WIDTH_VAR, which has to be set inline with it.
	 */
	hasBackdrop: boolean;
}>`
	position: absolute;
	box-sizing: border-box;
	transform: translate(-50%, -50%);
	border-radius: ${LABEL_BOX_CORNER_RADIUS}px;
	pointer-events: auto;
	${({ hasBackdrop }) =>
		hasBackdrop &&
		css`
			&::after {
				content: "";
				position: absolute;
				inset: calc(-1 * var(${LABEL_EDITOR_BORDER_WIDTH_VAR}));
				box-sizing: border-box;
				border: inherit;
				border-radius: inherit;
				pointer-events: none;
			}
		`}
`;

/**
 * The page's color and the frames' fills under the box, in SVG (LabelBackdropLayers),
 * drawn over the whole box, its border included, behind the text.
 */
export const ConnectorLabelEditorBackdrop = styled.svg`
	position: absolute;
	top: calc(-1 * var(${LABEL_EDITOR_BORDER_WIDTH_VAR}));
	left: calc(-1 * var(${LABEL_EDITOR_BORDER_WIDTH_VAR}));
	width: calc(100% + 2 * var(${LABEL_EDITOR_BORDER_WIDTH_VAR}));
	height: calc(100% + 2 * var(${LABEL_EDITOR_BORDER_WIDTH_VAR}));
	overflow: hidden;
	pointer-events: none;
`;

/**
 * Textarea for editing the connector label, styled to match the displayed label
 * text (font, size, alignment, and line wrapping) with a transparent background.
 *
 * Per-instance text styles (color / font-size / font-family / font-weight) are
 * passed via the `style` prop (see #131).
 */
export const ConnectorLabelTextArea = styled.textarea`
	/* Positioned, so it paints over the backdrop drawn before it. */
	position: relative;
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
