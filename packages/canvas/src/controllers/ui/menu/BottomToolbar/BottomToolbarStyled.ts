import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";
import { floatingBarStyles } from "../floatingBarStyles";
import { SIDE_PANEL_WIDTH } from "../sidePanelLayout";

/** Inset in px of the bottom tool bar from the viewport's bottom and sides. */
const BOTTOM_TOOLBAR_INSET = 16;

/** Gap in px between the bar and the Other shapes popover above it. */
const OTHER_SHAPES_POPOVER_GAP = 8;

/**
 * The column the bottom tool bar sits at the foot of, with the Other shapes
 * popover stacked above it while open. It spans the viewport (less the inset),
 * so the popover's width and height caps are fractions of the viewport.
 *
 * Positioned inside the viewport rather than laid out beside it, so the bar
 * covers the canvas instead of shrinking it and centres over what the sidebars
 * leave (when it shows: see Canvas's `bottomToolbar` prop). The column itself
 * takes no pointer input; the bar and the popover take their own back.
 */
export const BottomToolbarDock = styled.div`
	position: absolute;
	inset: 0 ${BOTTOM_TOOLBAR_INSET}px ${BOTTOM_TOOLBAR_INSET}px;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: center;
	gap: ${OTHER_SHAPES_POPOVER_GAP}px;
	pointer-events: none;
`;

/**
 * The floating bar centred at the bottom of the viewport (inside
 * BottomToolbarDock). A wheel over it reaches the canvas, as it does over the
 * ObjectMenu: the viewport's wheel listener covers it.
 */
export const BottomToolbarContainer = styled.div`
	flex: none;
	${floatingBarStyles}
`;

/**
 * The Other shapes popover: the shape library's search box and sections over
 * the canvas, as wide as the sidebar unless the viewport is narrower, and at
 * most 60% of its height, the list scrolling inside. Its whole area keeps the
 * wheel from the canvas (`data-gesture="chrome-wheel"` on the element).
 */
export const OtherShapesPopoverContainer = styled.div`
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	width: min(${SIDE_PANEL_WIDTH}px, 100%);
	max-height: 60%;
	min-height: 0;
	padding-top: 12px;
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	background: ${theme.surface};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;
