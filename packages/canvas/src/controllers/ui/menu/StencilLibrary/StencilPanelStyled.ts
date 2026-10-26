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
} from "../SidePanel/SidePanelStyled";

/** Where a stencil panel is: over the canvas (the flyout), or docked beside it. */
export type StencilPanelPresentation = "flyout" | "docked";

/**
 * A stencil panel, docked or open over the canvas (the flyout). Both are the
 * same column, SIDE_PANEL_WIDTH wide, beside the rail.
 *
 * Docked, it is a flex child between the rail and the viewport: `flex: none`
 * keeps its width while the viewport takes the rest, and the drawing keeps its
 * place on screen all the same, since the viewport's moving left edge is
 * compensated on the camera (see the CONTAINER_RESIZE case of canvasReducer).
 * Over the canvas it is laid out by the layer holding it (StencilFlyoutLayer)
 * and takes no space, so opening it never resizes the viewport.
 */
export const StencilPanelContainer = styled.aside<{
	presentation: StencilPanelPresentation;
}>`
	flex: none;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	width: ${SIDE_PANEL_WIDTH}px;
	background: ${theme.surface};
	border-right: 1px solid ${theme.border};
	user-select: none;
	${(props) =>
		props.presentation === "flyout"
			? `height: 100%; box-shadow: ${theme.shadow};`
			: ""}
`;

/**
 * Wrapper of the search box. Opts out of the gesture system so the input keeps
 * focus and receives its own keystrokes (the same opt-out ToolbarHostSlot uses).
 */
export const StencilPanelSearchField = styled.div`
	position: relative;
	display: flex;
	flex: none;
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
export const StencilPanelSearchInput = styled.input`
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

/** Scrolling body under the search box: the presets, the category list or the search results. */
export const StencilPanelList = styled.div`
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	/* The gutter is reserved from the start, so expanding a section past the
	   panel's height does not shrink the rows that are already laid out. */
	scrollbar-gutter: stable;
	padding-bottom: 8px;
	${scrollbarStyles}
`;

/**
 * One category of the catalog: the button switching the panel to it, and its
 * pin toggle. The pin shows only while the row is hovered or holds the focus,
 * or for good once the category is pinned.
 */
export const StencilCatalogRow = styled.div<{ isPinned: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 28px;
	padding-right: 8px;

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	& > button:last-of-type {
		opacity: ${(props) => (props.isPinned ? 1 : 0)};
	}

	&:hover > button:last-of-type,
	&:focus-within > button:last-of-type {
		opacity: 1;
	}
`;

/**
 * The part of a catalog row that switches the panel to its category: the icon
 * and the label. It takes the free width, leaving room for whatever the row
 * shows between the label and the pin.
 */
export const StencilCatalogRowOpenButton = styled.button`
	display: flex;
	flex: 1 1 auto;
	flex-direction: row;
	align-items: center;
	gap: 8px;
	min-width: 0;
	height: 100%;
	padding: 0 8px 0 ${SIDE_PANEL_INSET}px;
	border: none;
	background: transparent;
	color: ${theme.foreground};
	font-size: 12px;
	text-align: left;
	cursor: pointer;
`;

/** Category icon of a catalog row, matching the icon color of the stencil buttons. */
export const StencilCatalogRowIcon = styled.span`
	display: flex;
	flex: none;
	align-items: center;
	color: ${theme.iconForeground};
`;

/** Category label of a catalog row; cut short rather than pushing the pin out. */
export const StencilCatalogRowLabel = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/**
 * Pin toggle of a catalog row. One neutral color pinned or not: being visible
 * without a hover is what says it is pinned.
 */
export const StencilCatalogPinButton = styled.button`
	display: flex;
	flex: none;
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

	&:hover {
		background-color: ${theme.surfaceActive};
	}
`;

/**
 * Grid of stencil buttons: a category's presets, or the search results. Fixed
 * columns rather than wrapping, so the items line up down the panel.
 */
export const StencilPanelGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(6, ${STENCIL_BUTTON_SIZE}px);
	justify-content: space-between;
	gap: 2px;
	/* The list reserves the scrollbar's gutter on the right, so the end padding
	   gives it back to line the last column up with the search box's edge. That
	   holds where the webkit scrollbar styles apply (scrollbarStyles, Chromium
	   hosts), whose gutter is SCROLLBAR_WIDTH wide; elsewhere the native gutter
	   has another width and the last column sits off the box's edge by the
	   difference. */
	padding: 4px ${SIDE_PANEL_INSET - SCROLLBAR_WIDTH}px 8px ${SIDE_PANEL_INSET}px;
`;

/** Shown in place of the results when a search matches no stencil. */
export const StencilPanelEmptyMessage = styled.div`
	padding: 8px ${SIDE_PANEL_INSET}px;
	font-size: 12px;
	color: ${theme.foregroundMuted};
`;

/** Line under the search results telling that categories cut their matches short. */
export const StencilPanelMoreMatchesMessage = styled.div`
	padding: 0 ${SIDE_PANEL_INSET}px 8px;
	font-size: 11px;
	color: ${theme.foregroundMuted};
`;

/**
 * Text button under a category holding more presets than it lists; it moves the
 * focus to the search box. Opts out of the gesture system (`data-gesture="none"`
 * on the element) so the press reaches React's onClick instead of the panel's
 * handler, and the focus it moves is not taken back.
 */
export const StencilPanelMoreViaSearchButton = styled.button`
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
