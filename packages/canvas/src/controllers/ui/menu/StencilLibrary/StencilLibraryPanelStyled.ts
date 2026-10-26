import styled from "@emotion/styled";

import { STENCIL_BUTTON_SIZE } from "./StencilLibraryStyled";
import {
	SCROLLBAR_WIDTH,
	scrollbarStyles,
} from "../../../../foundation/theme/themeScrollbarStyles";
import { theme } from "../../../../foundation/theme/themeTokens";
import {
	SIDE_PANEL_INSET,
	SIDE_PANEL_WIDTH,
} from "../SidePanel/sidePanelLayout";

/**
 * The shape library sidebar: a fixed-width column between the toolbar and the
 * viewport, listing every stencil the host declared in `stencilLibrary.sections`.
 *
 * `flex: none` keeps it at its width while the viewport takes the rest; it takes
 * space rather than floating over the canvas, so nothing it covers is lost. The
 * drawing keeps its place on screen all the same: the viewport's moving left edge
 * is compensated on the camera (see the CONTAINER_RESIZE case of canvasReducer).
 */
export const StencilLibraryPanelContainer = styled.aside`
	flex: none;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	width: ${SIDE_PANEL_WIDTH}px;
	background: ${theme.surface};
	border-right: 1px solid ${theme.border};
	user-select: none;
`;

/** Title row of the panel: the heading and the close button. */
export const StencilLibraryPanelHeader = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	height: 36px;
	padding: 0 8px 0 ${SIDE_PANEL_INSET}px;
`;

/** Panel heading. Sized as a section label rather than a document title. */
export const StencilLibraryPanelTitle = styled.div`
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
`;

/** Close (×) button of the panel header. */
export const StencilLibraryPanelCloseButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	cursor: pointer;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

/**
 * Wrapper of the search box. Opts out of the gesture system so the input keeps
 * focus and receives its own keystrokes (the same opt-out ToolbarHostSlot uses).
 */
export const StencilLibrarySearchBox = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	margin: 0 ${SIDE_PANEL_INSET}px 8px;

	svg {
		position: absolute;
		left: 8px;
		color: ${theme.inputPlaceholder};
		pointer-events: none;
	}
`;

/**
 * Search field: matches the listed stencils by label, and reaches the rest of a
 * category through its own `search`.
 */
export const StencilLibrarySearchInput = styled.input`
	box-sizing: border-box;
	width: 100%;
	height: 28px;
	padding: 0 8px 0 28px;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 12px;
	outline: none;

	&::placeholder {
		color: ${theme.inputPlaceholder};
	}
`;

/** Scrolling body holding the sections (or the flat search results). */
export const StencilLibraryPanelList = styled.div`
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	/* The gutter is reserved from the start, so expanding a section past the
	   panel's height does not shrink the rows that are already laid out. */
	scrollbar-gutter: stable;
	padding-bottom: 8px;
	${scrollbarStyles}
`;

/** Section header. A full-width button so the whole row toggles the section. */
export const StencilLibrarySectionHeader = styled.button`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 6px;
	width: 100%;
	height: 28px;
	padding: 0 ${SIDE_PANEL_INSET}px 0 8px;
	border: none;
	background: transparent;
	color: ${theme.foreground};
	font-size: 12px;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

/**
 * Disclosure chevron of a section header. Drawn pointing right and rotated a
 * quarter turn while the section is expanded, so the turn animates.
 */
export const StencilLibrarySectionChevron = styled.span<{
	isExpanded: boolean;
}>`
	display: flex;
	align-items: center;
	color: ${theme.foregroundMuted};
	transform: rotate(${(props) => (props.isExpanded ? "90deg" : "0deg")});
	transition: transform 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
`;

/** Section icon slot, matching the icon color of the toolbar's stencil buttons. */
export const StencilLibrarySectionIcon = styled.span`
	display: flex;
	align-items: center;
	color: ${theme.iconForeground};
`;

/** Section label; takes the free space left over by the chevron and icon. */
export const StencilLibrarySectionLabel = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/**
 * Grid of stencil buttons under a section header (and of the flat search
 * results). Six button-wide columns rather than wrapping, so the items of every
 * section line up down the panel, spread across the inset with the free space
 * between them.
 */
export const StencilLibraryPanelGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(6, ${STENCIL_BUTTON_SIZE}px);
	justify-content: space-between;
	gap: 2px;
	/* The list reserves the scrollbar's gutter on the right, so the end padding
	   gives it back to line the last column up with the search box's edge. That
	   holds where the webkit scrollbar styles apply (the gutter is
	   SCROLLBAR_WIDTH wide there). */
	padding: 4px ${SIDE_PANEL_INSET - SCROLLBAR_WIDTH}px 8px ${SIDE_PANEL_INSET}px;
`;

/** Shown in place of the results when a search matches no stencil. */
export const StencilLibraryEmptyMessage = styled.div`
	padding: 8px ${SIDE_PANEL_INSET}px;
	font-size: 12px;
	color: ${theme.foregroundMuted};
`;

/** Line under the search results telling that categories cut their matches short. */
export const StencilLibraryMoreMatchesMessage = styled.div`
	padding: 0 ${SIDE_PANEL_INSET}px 8px;
	font-size: 11px;
	color: ${theme.foregroundMuted};
`;

/**
 * Text button under a section holding more presets than it lists; it moves the
 * focus to the search box. Opts out of the gesture system (`data-gesture="none"`
 * on the element) so the press reaches React's onClick instead of the panel's
 * handler, and the focus it moves is not taken back.
 */
export const StencilLibraryMoreViaSearchButton = styled.button`
	display: block;
	margin: -4px ${SIDE_PANEL_INSET}px 8px;
	padding: 0;
	border: none;
	background: transparent;
	color: ${theme.foregroundMuted};
	font-size: 11px;
	text-align: left;
	cursor: pointer;

	&:hover {
		color: ${theme.foreground};
		text-decoration: underline;
	}
`;
