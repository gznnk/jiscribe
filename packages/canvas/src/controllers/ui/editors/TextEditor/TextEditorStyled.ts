import styled from "@emotion/styled";

import {
	SCROLLBAR_WIDTH,
	scrollbarStyles,
} from "../../../../constants/scrollbarStyles";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

/**
 * Wrapper that carries the shape's position/transform and aligns the
 * textarea vertically, mirroring TextOverlayFrame's TextWrapper.
 *
 * Overflow stays visible so the textarea's scrollbar gutter can hang outside
 * the shape's right edge; vertical clipping is handled by the textarea's own
 * max-height.
 *
 * Per-instance values (transform / width / height / align-items) change with
 * the edited object and while typing (auto-grow), so they are passed via the
 * `style` prop instead of emotion interpolation (see #131).
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
 * Styled textarea element for the text editor (multi-line).
 *
 * Per-instance text styles (text-align / color / font-size / font-family /
 * font-weight) are passed via the `style` prop (see #131). Height is set
 * inline by TextEditor to fit the content, so the wrapper's vertical
 * alignment takes effect.
 *
 * The element is widened by the scrollbar width and reserves that extra strip
 * as a permanent gutter (scrollbar-gutter: stable), so the content box always
 * equals the shape width and line wrapping matches the displayed text whether or not
 * the scrollbar is shown; the scrollbar itself sits outside the shape's right
 * edge. flex-shrink: 0 keeps the flex parent from squeezing the extra width
 * back.
 */
export const TextArea = styled.textarea`
	width: calc(100% + ${SCROLLBAR_WIDTH}px);
	flex-shrink: 0;
	scrollbar-gutter: stable;
	max-height: 100%;
	line-height: ${TEXT_LINE_HEIGHT};
	word-break: break-word;
	white-space: pre-wrap;
	background: transparent;
	border: none;
	outline: none;
	overflow-y: auto;
	${scrollbarStyles}
	resize: none;
	box-sizing: border-box;
	padding: 2px 6px;
	pointer-events: auto;
	border-radius: 2px;
`;
