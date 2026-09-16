import styled from "@emotion/styled";

import {
	COMMENT_PANEL_BODY_MAX_HEIGHT,
	COMMENT_PANEL_HEADER_HEIGHT,
	COMMENT_PANEL_WIDTH,
} from "./CommentsConstants";
import { theme } from "../../../theme/themeTokens";

/**
 * Outer box of the panel content, drawn the same on both placements: as the
 * ObjectMenu's dropdown it sits inside `ObjectMenuDropdownPanel`, and beside a
 * marker inside the wrapper `CommentMarkerLayer` positions.
 *
 * The font is inherited rather than declared, so the panel reads in whatever
 * the host set on the canvas root.
 */
export const CommentPanelRoot = styled.div`
	display: flex;
	flex-direction: column;
	width: ${COMMENT_PANEL_WIDTH}px;
	box-sizing: border-box;
	color: ${theme.foreground};
	text-align: left;
`;

/** Header row: the section label, the object it comments on, and the close button. */
export const CommentPanelHeader = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	height: ${COMMENT_PANEL_HEADER_HEIGHT}px;
	padding: 0 8px 0 12px;
	border-bottom: 1px solid ${theme.borderSubtle};
`;

/** "Comments", in the same style as the properties sidebar's headings. */
export const CommentPanelLabel = styled.span`
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
	flex: 0 0 auto;
`;

/** The object's name, which is the one part of the header allowed to shrink. */
export const CommentPanelTargetName = styled.span`
	font-size: 12px;
	color: ${theme.foreground};
	flex: 0 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/** "· open N", pushed against the name and holding the close button to the right. */
export const CommentPanelOpenCount = styled.span`
	font-size: 11px;
	color: ${theme.foregroundMuted};
	flex: 1 1 auto;
	white-space: nowrap;
`;

/** Close (x) button; rides the menu's `toggle:` grammar rather than React state. */
export const CommentPanelCloseButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	flex: 0 0 auto;
	padding: 0;
	border: none;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
		color: ${theme.foreground};
	}
`;

/** Scrolling list of threads. */
export const CommentPanelBody = styled.div`
	display: flex;
	flex-direction: column;
	max-height: ${COMMENT_PANEL_BODY_MAX_HEIGHT}px;
	overflow-y: auto;
	padding: 4px 0;
	scrollbar-color: ${theme.scrollbarThumb} ${theme.scrollbarTrack};
`;

/** Footer row: the way to start a thread, or the notice that says why there is none. */
export const CommentPanelFooter = styled.div`
	display: flex;
	align-items: center;
	height: ${COMMENT_PANEL_HEADER_HEIGHT}px;
	padding: 0 12px;
	border-top: 1px solid ${theme.borderSubtle};
`;

/** "+ New thread". */
export const CommentPanelFooterButton = styled.button`
	display: flex;
	align-items: center;
	padding: 0;
	border: none;
	background: transparent;
	color: ${theme.accent};
	font-size: 12px;
	font-weight: 600;
	font-family: inherit;
	cursor: pointer;
`;

/** Stands in for the footer button while no author name is set. */
export const CommentPanelReadOnlyNotice = styled.div`
	font-size: 11px;
	color: ${theme.foregroundMuted};
	line-height: 1.4;
`;

/** A thread shown as a single row; the whole row is the target that expands it. */
export const CommentThreadCollapsedRow = styled.div`
	display: grid;
	grid-template-columns: 24px 1fr auto;
	grid-template-rows: auto auto;
	column-gap: 8px;
	row-gap: 2px;
	align-items: center;
	padding: 6px 12px;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

/** The expanded thread, marked out by the accent rule down its left edge. */
export const CommentThreadExpanded = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 12px;
	border-left: 2px solid ${theme.accent};
	background-color: ${theme.surfaceHover};
`;

/** Dims a resolved thread wherever it is drawn. */
export const CommentThreadResolvedFrame = styled.div`
	opacity: 0.6;
`;

/** One comment: avatar, then its heading and body, then the buttons that act on it. */
export const CommentRow = styled.div<{ isReply?: boolean }>`
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding-left: ${(props) => (props.isReply ? "32px" : "0")};

	/* The actions are revealed by hovering the comment they belong to; they keep
	   their space so the heading does not jump when they appear. */
	&:hover .jiscribe-comment-actions {
		opacity: 1;
	}
`;

/** Round avatar carrying the writer's initial; its color comes from the author's name. */
export const CommentAvatar = styled.div<{ color: string }>`
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background-color: ${(props) => props.color};
	color: #ffffff;
	font-size: 11px;
	font-weight: 600;
`;

/** Everything to the right of the avatar. */
export const CommentContent = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1 1 auto;
	min-width: 0;
`;

/** Author, time and the "edited" mark, on one line. */
export const CommentHeading = styled.div`
	display: flex;
	align-items: baseline;
	gap: 6px;
	min-width: 0;
`;

export const CommentAuthorName = styled.span`
	font-size: 12px;
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

export const CommentTimestamp = styled.span`
	font-size: 11px;
	color: ${theme.foregroundMuted};
	white-space: nowrap;
`;

/** The comment text. Selectable, since quoting it is the point of reading it. */
export const CommentBody = styled.div`
	font-size: 13px;
	line-height: 1.5;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	user-select: text;
`;

/** The root body of a collapsed thread, cut to its first line. */
export const CommentThreadPreview = styled.div`
	grid-column: 2 / 4;
	font-size: 12px;
	color: ${theme.foregroundMuted};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/** "N replies", right-aligned on a collapsed thread's row. */
export const CommentThreadReplyCount = styled.span`
	font-size: 11px;
	color: ${theme.foregroundMuted};
	white-space: nowrap;
`;

/** Hover-revealed buttons of one comment (edit, delete); resolve sits beside them, always shown. */
export const CommentActions = styled.div`
	display: flex;
	align-items: center;
	gap: 2px;
	flex: 0 0 auto;
	opacity: 0;
	transition: opacity 0.15s cubic-bezier(0.645, 0.045, 0.355, 1);
`;

/** One 20px icon button inside {@link CommentActions}. */
export const CommentIconButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	padding: 0;
	border: none;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceActive};
		color: ${theme.foreground};
	}
`;

/** Row that opens and closes the resolved threads. */
export const CommentResolvedSectionToggle = styled.button`
	display: flex;
	align-items: center;
	gap: 6px;
	width: 100%;
	height: 28px;
	padding: 0 12px;
	border: none;
	background: transparent;
	color: ${theme.foregroundMuted};
	font-size: 11px;
	font-family: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

/** The line naming who resolved a thread, above its comments. */
export const CommentResolvedBy = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: ${theme.foregroundMuted};
`;

/** Composer box: the textarea with its hint and submit button below it. */
export const CommentComposer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 12px;
`;

export const CommentTextArea = styled.textarea`
	width: 100%;
	box-sizing: border-box;
	min-height: 52px;
	padding: 6px 8px;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background-color: ${theme.inputBg};
	color: ${theme.inputFg};
	font-family: inherit;
	font-size: 13px;
	line-height: 1.5;
	resize: vertical;

	&::placeholder {
		color: ${theme.inputPlaceholder};
	}

	&:focus {
		outline: 1px solid ${theme.accent};
	}
`;

/** The hint and the submit button, on one line under the textarea. */
export const CommentComposerActions = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
`;

export const CommentComposerHint = styled.span`
	font-size: 11px;
	color: ${theme.foregroundMuted};
	margin-right: auto;
`;

/** Filled button that posts what the composer holds. */
export const CommentSubmitButton = styled.button`
	height: 28px;
	padding: 0 12px;
	border: none;
	border-radius: ${theme.radius};
	background-color: ${theme.accent};
	color: #ffffff;
	font-family: inherit;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
`;

/** Unfilled button beside a submit one (cancel an edit, reopen a thread). */
export const CommentSecondaryButton = styled.button`
	height: 28px;
	padding: 0 10px;
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.foreground};
	font-family: inherit;
	font-size: 12px;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;
