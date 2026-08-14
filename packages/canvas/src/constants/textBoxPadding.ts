/**
 * Horizontal inner padding of a text box, in px. One value shared by the CSS that
 * draws the box (TextOverlayFrameStyled, ConnectorLabelStyled), the CSS of the
 * textareas that edit it (TextEditorStyled, ConnectorLabelEditorStyled), and the
 * offscreen measurement that sizes and hit-tests it (calcTextBlockSize,
 * calcTextLineHitRects). Splitting it breaks two ways: a box
 * sized with less padding than the browser then applies clips the end of every
 * line, and an editor padded unlike the display shifts the text the moment editing
 * starts.
 */
export const TEXT_BOX_PADDING_X = 6;

/**
 * Vertical inner padding of a text box, in px. Under the same single-value
 * contract as TEXT_BOX_PADDING_X: a box sized with less than the drawn padding
 * clips the first and last lines.
 */
export const TEXT_BOX_PADDING_Y = 2;
