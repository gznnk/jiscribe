/**
 * Inner padding of the box. Must stay equal to the `padding: 2px 6px` of
 * TextOverlayFrameStyled's TextContent, or the measured box and the drawn one
 * disagree on where the text ends.
 */
export const TEXT_BLOCK_PADDING_X = 6;
export const TEXT_BLOCK_PADDING_Y = 2;

/**
 * Added to the measured width. The offscreen measurement and the browser's own
 * layout disagree by a fraction of a pixel (hinting, subpixel positioning), and
 * a box short by that fraction clips the last character.
 */
export const TEXT_BLOCK_WIDTH_SLACK = 2;
