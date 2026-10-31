import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../foundation/theme/themeScrollbarStyles";
import { theme } from "../../../../foundation/theme/themeTokens";
import { FLOATING_BAR_INSET, TOOLBAR_PILL_BOTTOM } from "../floatingBarLayout";
import { floatingBarStyles } from "../floatingBarStyles";
import { SIDE_PANEL_WIDTH } from "../sidePanelLayout";

/** Gap in px between the bottom of a top-bar pill and the band the dock spans. */
const PILL_CLEARANCE = 8;

/** Gap in px between the bar and the Other shapes popover beside it. */
const OTHER_SHAPES_POPOVER_GAP = 8;

/**
 * The band down the viewport's left edge that the stencil bar sits in,
 * centred top to bottom, with the Other shapes popover beside it while open.
 * The band starts below the start pill, whether or not the toolbar has one,
 * and stops short of the viewport's bottom and right edges by the inset.
 *
 * Positioned inside the viewport rather than laid out beside it, so the bar
 * covers the canvas instead of shrinking it (when it shows: see Canvas's
 * `stencilBar` prop). The band itself takes no pointer input; the bar and
 * the popover take their own back.
 */
export const StencilBarDock = styled.div`
	position: absolute;
	inset: ${TOOLBAR_PILL_BOTTOM + PILL_CLEARANCE}px ${FLOATING_BAR_INSET}px
		${FLOATING_BAR_INSET}px;
	display: flex;
	flex-direction: row;
	gap: ${OTHER_SHAPES_POPOVER_GAP}px;
	pointer-events: none;
`;

/**
 * The floating bar, its items in one column, centred top to bottom in
 * StencilBarDock. A band shorter than the bar keeps the bar at its top,
 * clear of the start pill, and the bar scrolls inside. A wheel over it reaches
 * the canvas, as it does over the ObjectMenu, unless the bar is scrolling
 * (`data-gesture="native-wheel"` on the element).
 */
export const StencilBarContainer = styled.div`
	${floatingBarStyles}
	flex: none;
	margin-block: auto;
	flex-direction: column;
	max-height: 100%;
	overflow-y: auto;
	${scrollbarStyles}

	& > * {
		flex: none;
	}
`;

/** Horizontal divider between the presets and Other shapes. */
export const StencilBarDivider = styled.div`
	width: 20px;
	height: 1px;
	margin: 4px 0;
	background-color: ${theme.borderSubtle};
`;

/**
 * The Other shapes popover: the shape library's search box and sections over
 * the canvas, the band's full height and as wide as the sidebar unless what
 * the band leaves beside the bar is narrower, the list scrolling inside. Its
 * whole area keeps the wheel from the canvas
 * (`data-gesture="native-wheel-always"` on the element).
 */
export const OtherShapesPopoverContainer = styled.div`
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	flex: 0 1 ${SIDE_PANEL_WIDTH}px;
	min-width: 0;
	min-height: 0;
	padding-top: 12px;
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	background: ${theme.surface};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;
