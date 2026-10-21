import styled from "@emotion/styled";

import { theme } from "../../../../../../theme/themeTokens";

/**
 * Styled root of the dropdown panel. Rendered centered below or above the button.
 *
 * The horizontal correction (translateX with offsetX) is a measured value that
 * can change every frame while the menu follows the selection, so
 * ObjectMenuDropdownPanel applies it via the `style` prop instead of emotion
 * interpolation (see #131).
 */
export const ObjectMenuDropdownPanelRoot = styled.div<{
	placement?: "down" | "up";
}>`
	position: absolute;
	left: 50%;
	${({ placement }) => (placement === "up" ? "bottom: 40px;" : "top: 40px;")}
	z-index: 1100;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: flex-start;
	pointer-events: auto;
	gap: 8px;
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
`;
