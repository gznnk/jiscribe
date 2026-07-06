import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../constants/scrollbarStyles";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

/**
 * Wrapper that carries the shape's position/transform and aligns the
 * textarea vertically, mirroring TextOverlay's TextWrapper.
 *
 * Per-instance values (left / top / transform / width / height / align-items)
 * change with the edited object and while typing (auto-grow), so they are
 * passed via the `style` prop instead of emotion interpolation (see #131).
 */
export const TextEditorWrapper = styled.div`
	position: absolute;
	display: flex;
	overflow: hidden;
	pointer-events: auto;
`;

/**
 * Styled textarea element for the text editor (multi-line).
 *
 * Per-instance text styles (text-align / color / font-size / font-family /
 * font-weight) are passed via the `style` prop (see #131). Height is set
 * inline by TextEditor to fit the content, so the wrapper's vertical
 * alignment takes effect.
 */
export const TextArea = styled.textarea`
	width: 100%;
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
