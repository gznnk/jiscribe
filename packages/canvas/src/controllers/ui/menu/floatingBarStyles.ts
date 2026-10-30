import { css } from "@emotion/react";

import { theme } from "../../../foundation/theme/themeTokens";

/** Padding in px between a floating bar's border and its items, on every side. */
export const FLOATING_BAR_PADDING = 4;

/** Width in px of a floating bar's border. */
export const FLOATING_BAR_BORDER_WIDTH = 1;

/**
 * The look shared by every bar that floats over the canvas instead of taking
 * layout space beside it: the bottom tool bar and the two pills the top bar
 * collapses into. Only the surface and the row of items; where the bar sits,
 * and which way its items run, is each container's own.
 */
export const floatingBarStyles = css`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	padding: ${FLOATING_BAR_PADDING}px;
	border: ${FLOATING_BAR_BORDER_WIDTH}px solid ${theme.border};
	border-radius: ${theme.radius};
	background: ${theme.surface};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;
