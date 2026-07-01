import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

/**
 * Arrow selector grid (3 columns).
 * Placed inside a DropdownPanel.
 */
export const ArrowSelectorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
	padding: 8px;
`;

/**
 * Arrow type selection button.
 * Displays an SVG preview.
 */
export const ArrowTypeButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 2px;
	border: 1px solid ${(p) => (p.isActive ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${(p) => (p.isActive ? theme.surfaceActive : "transparent")};
	cursor: pointer;
	color: ${theme.foreground};
	transition: all 0.15s;

	&:hover {
		background: ${theme.surfaceHover};
		border-color: ${theme.border};
	}
`;
