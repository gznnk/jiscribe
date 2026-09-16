import styled from "@emotion/styled";

import {
	COMMENT_PANEL_WIDTH,
	COMMENT_MARKER_HEIGHT,
	COMMENT_MARKER_WIDTH,
} from "./CommentsConstants";
import { theme } from "../../../theme/themeTokens";

/** Class the bubble outline carries, so the root's CSS can recolor it on hover. */
export const COMMENT_MARKER_BUBBLE_CLASS = "jiscribe-comment-marker-bubble";

/**
 * The marker over an object's top-right corner.
 *
 * Its size is in px and does not follow the zoom — only the position does, so
 * `left` / `top` are passed through the `style` prop, which changes every frame
 * during a pan (see #131). The overlay it sits in takes no pointer events, so
 * the marker takes them back.
 */
export const CommentMarkerRoot = styled.div<{
	isActive: boolean;
	isAllResolved: boolean;
}>`
	position: absolute;
	width: ${COMMENT_MARKER_WIDTH}px;
	height: ${COMMENT_MARKER_HEIGHT}px;
	pointer-events: auto;
	cursor: pointer;
	user-select: none;
	opacity: ${(props) => (props.isAllResolved ? 0.55 : 1)};
	/* Inherited by the count and the check inside the bubble. */
	color: ${(props) => (props.isActive ? "#ffffff" : theme.foreground)};

	.${COMMENT_MARKER_BUBBLE_CLASS} {
		fill: ${(props) => (props.isActive ? theme.accent : theme.surface)};
		stroke: ${(props) =>
			props.isActive ? theme.canvasBg : theme.foregroundMuted};
	}

	&:hover .${COMMENT_MARKER_BUBBLE_CLASS} {
		stroke: ${theme.foreground};
	}
`;

/** The count drawn inside the bubble; its color comes from the root. */
export const CommentMarkerLabel = styled.text`
	font-size: 11px;
	font-weight: 600;
	fill: currentColor;
`;

/**
 * Wrapper of the panel opened beside a marker. Carries the ObjectMenu's own
 * surface, and the same `data-kind` / `data-id` the dropdown declares, so a
 * press inside it is claimed by ObjectMenuHandler instead of climbing to the
 * viewport and dropping the selection.
 *
 * `left` / `top` follow the marker every frame, so they ride the `style` prop.
 */
export const CommentMarkerPanelWrapper = styled.div`
	position: absolute;
	z-index: 1100;
	width: ${COMMENT_PANEL_WIDTH}px;
	pointer-events: auto;
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
`;
