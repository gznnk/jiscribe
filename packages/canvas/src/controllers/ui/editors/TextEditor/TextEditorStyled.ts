import styled from "@emotion/styled";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/text/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/textLineHeight";

import {
	SCROLLBAR_WIDTH,
	scrollbarStyles,
} from "../../../../constants/scrollbarStyles";

/**
 * Wrapper that carries the shape's position/transform and aligns the editable
 * surface vertically, mirroring TextOverlayFrame's TextWrapper.
 *
 * Overflow stays visible so the surface's scrollbar gutter can hang outside
 * the shape's right edge; vertical clipping is handled by the surface's own
 * max-height, which TextEditor sets to the region for a "scroll" slot and to
 * the shape's bottom edge for a "grow" one (see ObjectTextEditOverflowRegistry).
 *
 * Per-instance values (transform / width / height or min-height / align-items)
 * change with the edited object and while typing (auto-grow), so they are
 * passed via the `style` prop instead of emotion interpolation (see #131).
 * Which of height / min-height carries the region is what separates the two
 * overflow modes, so both are left to that prop rather than split into styled
 * variants.
 */
export const TextEditorWrapper = styled.div`
	position: absolute;
	left: 0;
	top: 0;
	/* The transform must compose about the shape's local origin like the SVG
	 * side (TextOverlayFrame), not about the element center CSS defaults to —
	 * with an off-center text region (record slots) the two differ once the
	 * shape is rotated or flipped. */
	transform-origin: 0 0;
	display: flex;
	overflow: visible;
	pointer-events: auto;
`;

/**
 * The surface the shape's text is edited on: a contenteditable div, so the runs a
 * body is styled in are drawn by the very element the caret and the selection are
 * laid out in (a textarea has one style for the whole of its value, which put both
 * where the unstyled text would be — issue #7). Its content is built and read back
 * by editableTextDom; React renders it empty.
 *
 * Per-instance text styles (text-align / color / font-size / font-family /
 * font-weight) and max-height are passed via the `style` prop (see #131).
 * The height follows the content on its own, so the wrapper's vertical alignment
 * takes effect; max-height then clips it back and turns the excess into scrolling
 * — at the region for a "scroll" slot, at the shape's bottom edge for a "grow"
 * one, which until that point pushes the wrapper's min-height instead of
 * scrolling.
 *
 * The element is widened by the scrollbar width and reserves that extra strip
 * as a permanent gutter (scrollbar-gutter: stable), so the content box always
 * equals the shape width and line wrapping matches the displayed text whether
 * or not the scrollbar is shown; the scrollbar itself sits outside the shape's
 * right edge. flex-shrink: 0 keeps the flex parent from squeezing the extra
 * width back.
 */
export const EditableTextSurface = styled.div`
	width: calc(100% + ${SCROLLBAR_WIDTH}px);
	flex-shrink: 0;
	scrollbar-gutter: stable;
	line-height: ${TEXT_LINE_HEIGHT};
	word-break: break-word;
	white-space: pre-wrap;
	background: transparent;
	border: none;
	outline: none;
	overflow-y: auto;
	${scrollbarStyles}
	box-sizing: border-box;
	padding: ${TEXT_BOX_PADDING_Y}px ${TEXT_BOX_PADDING_X}px;
	pointer-events: auto;
	border-radius: 2px;
	/* The canvas root switches text selection off and only form elements opt back
	   in (CanvasStyled), so an editable div has to say so itself; without it a drag
	   inside the text selects nothing. */
	user-select: text;
	-webkit-user-select: text;
`;
