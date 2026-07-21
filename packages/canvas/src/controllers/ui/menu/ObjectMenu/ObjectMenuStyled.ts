import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * Outer container of the ObjectMenu.
 * Positioned in canvas coordinates inside ScrollSyncedOverlay.
 *
 * left / top follow the selection every frame during pan/zoom, so they are
 * passed via the `style` prop instead of emotion interpolation (see #131).
 */
export const ObjectMenuWrapper = styled.div`
	position: absolute;
	pointer-events: auto;
	display: flex;
	align-items: center;
`;

/**
 * Inner container of the ObjectMenu (with shadow).
 */
export const ObjectMenuContainer = styled.div`
	height: 40px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 14px;
	padding: 4px 8px;
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;

/**
 * Section (group) container of the menu.
 *
 * The divider is drawn with `::before` (a CSS border) rather than a standalone element.
 * This way, a section that renders nothing (e.g. a custom component returns `null`, or all
 * items are skipped as duplicates) is automatically collapsed **along with its divider**
 * via `:empty`.
 *
 * Note: pure CSS has no way to look at the "previous *visible* sibling", so a divider can
 * remain at the start only if the structurally first section becomes empty (in the current
 * menu configuration the first section is always visible).
 */
export const ObjectMenuSectionRow = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;

	&:empty {
		display: none;
	}

	&:not(:first-child)::before {
		content: "";
		width: 1px;
		height: 16px;
		margin: 0 8px;
		background-color: ${theme.borderSubtle};
		align-self: center;
	}
`;

/**
 * Shared menu button style.
 */
export const ObjectMenuButton = styled.button<{ isActive?: boolean }>`
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
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	svg {
		color: ${theme.iconForeground};
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	&:hover svg {
		color: ${theme.foreground};
	}

	&.active svg {
		color: ${theme.foreground};
	}

	&:disabled {
		cursor: default;
	}

	&:disabled:hover {
		background-color: transparent;
	}

	&:disabled svg,
	&:disabled:hover svg {
		color: ${theme.disabledForeground};
	}
`;

/**
 * Positioning container for a menu button (relative).
 * Serves as the anchor position for the dropdown.
 */
export const ObjectMenuItemPositioner = styled.div`
	position: relative;
`;
