import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../theme/themeScrollbarStyles";
import { theme } from "../../../../theme/themeTokens";

/**
 * Width of the sidebar. Sized for six 34px stencil buttons per row with 2px gaps
 * (214px) inside 12px side paddings, plus the scrollbar gutter the list reserves
 * (SCROLLBAR_WIDTH) and the border.
 */
const PANEL_WIDTH = "248px";

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
	width: ${PANEL_WIDTH};
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
	padding: 0 8px 0 12px;
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
	margin: 0 12px 8px;

	svg {
		position: absolute;
		left: 8px;
		color: ${theme.inputPlaceholder};
		pointer-events: none;
	}
`;

/** Search field filtering the listed stencils by label. */
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
	padding: 0 12px 0 8px;
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
 * results). Six fixed columns rather than wrapping, so the items of every
 * section line up down the panel.
 */
export const StencilLibraryPanelGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 2px;
	padding: 4px 12px 8px;
`;

/** Shown in place of the results when a search matches no stencil. */
export const StencilLibraryEmptyMessage = styled.div`
	padding: 8px 12px;
	font-size: 12px;
	color: ${theme.foregroundMuted};
`;
