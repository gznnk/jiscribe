import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * Container for the full-width integrated toolbar pinned to the top.
 * Places shape tools on the left and the zoom readout / help on the right.
 *
 * Laid out as the first child of CanvasRoot (a flex column), stacked above the
 * canvas area (occupying space rather than overlaying it).
 */
export const ToolbarContainer = styled.div`
	position: relative;
	flex: 0 0 40px;
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 0 8px;
	gap: 4px;
	background-color: ${theme.surface};
	border-bottom: 1px solid ${theme.border};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;

/**
 * Button group within the toolbar (left-aligned / right-aligned).
 */
export const ToolbarGroup = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
`;

/**
 * Container for host-provided toolbar UI (CanvasProps.toolbarLeading / toolbarTrailing).
 * Opts the slot out of the gesture system so plain onClick works.
 */
export const ToolbarHostSlot = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
`;

/**
 * Vertical divider within the toolbar.
 */
export const ToolbarDivider = styled.div`
	width: 1px;
	height: 20px;
	margin: 0 4px;
	background-color: ${theme.borderSubtle};
	align-self: center;
`;

/**
 * Toolbar icon button (for zoom / help).
 */
export const ToolbarIconButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 1px solid transparent;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	&:active {
		background-color: ${theme.surfaceActive};
	}

	&:disabled {
		color: ${theme.disabledForeground};
		cursor: default;
	}

	&:disabled:hover,
	&:disabled:active {
		background-color: transparent;
	}

	svg {
		color: ${theme.iconForeground};
	}
`;

/**
 * Zoom-level readout. Doubles as a button that resets to 100% on click.
 */
export const ZoomReadout = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	min-width: 44px;
	padding: 0 4px;
	border: 1px solid transparent;
	border-radius: ${theme.radius};
	background: transparent;
	font-size: 11px;
	font-weight: 500;
	line-height: 1;
	text-align: center;
	color: ${theme.foregroundMuted};
	cursor: pointer;
	user-select: none;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	&:active {
		background-color: ${theme.surfaceActive};
	}
`;
