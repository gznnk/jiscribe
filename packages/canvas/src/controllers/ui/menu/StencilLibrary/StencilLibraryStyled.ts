import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * Edge of a stencil button in px: a library item, and the rail's own buttons
 * sized like them. The rail's overflow arithmetic counts in it
 * (resolveStencilRailOverflow).
 */
export const STENCIL_BUTTON_SIZE = 32;

/**
 * Individual item button in the stencil library.
 * Placed on the stencil rail and in the stencil panels (StencilPanel),
 * the flyout and the docked one alike.
 */
export const StencilLibraryButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: ${STENCIL_BUTTON_SIZE}px;
	height: ${STENCIL_BUTTON_SIZE}px;
	padding: 0;
	border-radius: ${theme.radius};
	border: 1px solid
		${(props) => (props.isActive ? theme.accent : "transparent")};
	background: ${(props) =>
		props.isActive ? theme.surfaceActive : "transparent"};
	cursor: ${(props) => (props.isActive ? "crosshair" : "grab")};
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	svg {
		color: ${theme.iconForeground};
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}
`;
