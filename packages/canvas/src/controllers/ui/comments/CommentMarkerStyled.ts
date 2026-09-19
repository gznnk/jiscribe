import styled from "@emotion/styled";

import {
	COMMENT_PANEL_WIDTH,
	COMMENT_MARKER_HEIGHT,
	COMMENT_MARKER_WIDTH,
} from "./CommentsConstants";
import { CommentCountBadgeBase } from "./CommentsStyled";
import { theme } from "../../../theme/themeTokens";

/**
 * The marker over an object's top edge: a pin rounded on three corners, the
 * square one pointing down at the object.
 *
 * Its size is in px and does not follow the zoom — only the position does, so
 * `left` / `top` are passed through the `style` prop, which changes every frame
 * during a pan (see #131). The overlay it sits in takes no pointer events, so
 * the marker takes them back. Kept to the menu surface's own colors, so it reads
 * as a note on the diagram rather than competing with it; the accent is left to
 * the count badge and the active state.
 */
export const CommentMarkerRoot = styled.div<{
	isActive: boolean;
	isAllResolved: boolean;
}>`
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	width: ${COMMENT_MARKER_WIDTH}px;
	height: ${COMMENT_MARKER_HEIGHT}px;
	box-sizing: border-box;
	border: 1px solid
		${(props) => (props.isActive ? theme.accent : theme.foregroundMuted)};
	border-radius: ${COMMENT_MARKER_WIDTH / 2}px ${COMMENT_MARKER_WIDTH / 2}px
		${COMMENT_MARKER_WIDTH / 2}px 3px;
	background-color: ${(props) =>
		props.isActive ? theme.accent : theme.surface};
	box-shadow: ${theme.shadow};
	color: ${(props) =>
		props.isActive
			? "#ffffff"
			: props.isAllResolved
				? theme.foregroundMuted
				: theme.foreground};
	pointer-events: auto;
	cursor: pointer;
	user-select: none;

	&:hover {
		border-color: ${theme.foreground};
	}
`;

/**
 * The pin's own count badge: over its top-right corner, with a ring in the
 * canvas color so it stays apart from the pin once that turns accent too.
 */
export const CommentMarkerCountBadge = styled(CommentCountBadgeBase)`
	top: -7px;
	right: -7px;
	box-shadow: 0 0 0 1.5px ${theme.canvasBg};
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
