import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * Individual item button in the shape library.
 * Placed inside the unified toolbar (Toolbar).
 */
export const ShapeLibraryButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
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
