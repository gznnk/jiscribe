import { css } from "@emotion/react";

import { theme } from "../../../foundation/theme/themeTokens";

/**
 * The look shared by every bar that floats over the canvas instead of taking
 * layout space beside it: the bottom tool bar and the two pills the top bar
 * collapses into. Only the surface and the row of items; where the bar sits is
 * each container's own.
 */
export const floatingBarStyles = css`
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	padding: 4px;
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	background: ${theme.surface};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;
