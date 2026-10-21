import styled from "@emotion/styled";

import { theme } from "../../../../theme/themeTokens";

/**
 * left / top follow the pointer, so they are passed via the `style` prop
 * instead of emotion interpolation (see #131).
 */
export const Menu = styled.div`
	position: fixed;
	background: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
	min-width: 200px;
	padding: 4px 0;
	z-index: 1001;
	font-size: 14px;
	pointer-events: auto;
`;

export const MenuItem = styled.button<{ disabled?: boolean }>`
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px;
	border: none;
	background: transparent;
	color: ${(props) =>
		props.disabled ? theme.disabledForeground : theme.foreground};
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	text-align: left;
	transition: background-color 0.15s;

	&:hover {
		background: ${(props) =>
			props.disabled ? "transparent" : theme.surfaceHover};
	}

	&:active {
		background: ${(props) =>
			props.disabled ? "transparent" : theme.surfaceActive};
	}
`;

export const MenuItemLabel = styled.span`
	flex: 1;
`;

export const MenuItemShortcut = styled.span`
	margin-left: 24px;
	color: ${theme.foregroundMuted};
	font-size: 12px;
`;

export const MenuSeparator = styled.div`
	height: 1px;
	background: ${theme.borderSubtle};
	margin: 4px 0;
`;
