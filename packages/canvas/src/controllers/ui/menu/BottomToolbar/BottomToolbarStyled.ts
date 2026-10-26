import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * The floating bar centred at the bottom of the viewport.
 *
 * Positioned inside the viewport rather than laid out beside it, so it covers
 * the canvas instead of shrinking it, and is centred over the part of the
 * canvas the sidebars leave visible. A wheel over it reaches the canvas, as it
 * does over the ObjectMenu: the viewport's wheel listener covers it.
 */
export const BottomToolbarContainer = styled.div`
	position: absolute;
	left: 50%;
	bottom: 16px;
	transform: translateX(-50%);
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
