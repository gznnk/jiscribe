import styled from "@emotion/styled";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/text/block/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "@jiscribe/doc/text/layout/textLineHeight";

/**
 * Vertical alignment (align-items) is a per-instance value passed via the
 * `style` prop instead of emotion interpolation (see #131).
 */
export const TextWrapper = styled.div`
	display: flex;
	width: 100%;
	height: 100%;
	overflow: hidden;
`;

/**
 * The content box every text overlay shares. It owns the geometry-affecting
 * half of the display/edit visual contract (line-height and padding), which the
 * export path also reads back off this element via `getComputedStyle`
 * (see foreignObjectToSvgText). The remaining per-instance styles (text-align /
 * color / font-size / font-family / font-weight) arrive through the `style`
 * prop rather than emotion interpolation (see #131).
 *
 * `white-space` / `word-break` default to plain-text behavior (authored
 * newlines kept, long words broken mid-token). Content that lays itself out as
 * HTML blocks — Markdown, for one — overrides both on its own subtree.
 */
export const TextContent = styled.div`
	width: 100%;
	line-height: ${TEXT_LINE_HEIGHT};
	border: none;
	outline: none;
	background: transparent;
	pointer-events: none;
	user-select: none;
	overflow: hidden;
	padding: ${TEXT_BOX_PADDING_Y}px ${TEXT_BOX_PADDING_X}px;
	box-sizing: border-box;
	white-space: pre-wrap;
	word-break: break-word;
`;

export const ForeignObjectElement = styled.foreignObject`
	opacity: 1;
`;
