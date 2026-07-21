import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

/**
 * Styled root of the dropdown panel. Rendered centered below or above the button.
 *
 * Placement (top/bottom) and the horizontal correction (translateX with
 * offsetX) are measured values that can change every frame while the menu
 * follows the selection, so ObjectMenuDropdownPanel applies them via the `style` prop
 * instead of emotion interpolation (see #131).
 */
export const ObjectMenuDropdownPanelRoot = styled.div`
	position: absolute;
	left: 50%;
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
