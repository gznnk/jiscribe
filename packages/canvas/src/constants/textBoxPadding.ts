/**
 * Horizontal inner padding of a text box, in px. The same number is interpolated
 * into the CSS that draws the box (TextOverlayFrameStyled's TextContent,
 * ConnectorLabelStyled's LabelBox) and added to the offscreen measurement that
 * sizes it, so it has to stay one value: a box sized with less padding than the
 * browser then applies clips the end of every line.
 */
export const TEXT_BOX_PADDING_X = 6;

/**
 * Vertical inner padding of a text box, in px. Under the same single-value
 * contract as TEXT_BOX_PADDING_X: a box sized with less than the drawn padding
 * clips the first and last lines.
 */
export const TEXT_BOX_PADDING_Y = 2;
