import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";
import { floatingBarStyles } from "../floatingBarStyles";

/** Inset in px of each collapsed-bar pill from the viewport's top and side. */
const TOOLBAR_PILL_INSET = 12;

/**
 * Container for the full-width integrated toolbar pinned to the top, the form
 * the bar takes while either sidebar is open (see ToolbarPill for the other).
 * Holds the sections in order, the `align: "start"` ones packed left and the
 * `align: "end"` ones right.
 *
 * Laid out as the first child of CanvasRoot (a flex column), stacked above the
 * canvas area (occupying space rather than overlaying it). The bottom border is
 * its only separation from what sits below.
 *
 * Overflow stays `visible`, so a bar too wide for the canvas runs off its edge.
 * Scrolling it is not an option while the category flyout hangs below the bar:
 * a non-visible overflow on either axis makes the other one `auto` as well, and
 * the flyout would be clipped away. Narrow layouts wait for the overflow menu.
 */
export const ToolbarContainer = styled.div`
	position: relative;
	flex: 0 0 40px;
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 0 8px;
	gap: 4px;
	background-color: ${theme.surface};
	border-bottom: 1px solid ${theme.border};
	pointer-events: auto;
	user-select: none;
`;

/**
 * One of the two pills the toolbar collapses into while both sidebars are
 * closed, floating over a top corner of the viewport with the bottom tool
 * bar's look. Positioned inside the viewport like the bottom bar, so it covers
 * the canvas instead of shrinking it and a wheel over it reaches the canvas.
 */
export const ToolbarPill = styled.div<{ edge: "start" | "end" }>`
	position: absolute;
	top: ${TOOLBAR_PILL_INSET}px;
	${(props) =>
		props.edge === "start"
			? `left: ${TOOLBAR_PILL_INSET}px;`
			: `right: ${TOOLBAR_PILL_INSET}px;`}
	${floatingBarStyles}
`;

/**
 * One section of the toolbar (see ToolbarSection).
 *
 * Right alignment is an auto left margin on the first `align: "end"` section
 * rather than `justify-content` on the container, which only knows two groups
 * and breaks as soon as a third section appears.
 */
export const ToolbarGroup = styled.div<{ startsEndGroup?: boolean }>`
	display: flex;
	flex: 0 0 auto;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	${(props) => (props.startsEndGroup ? "margin-left: auto;" : "")}
`;

/**
 * Container for host-provided toolbar UI (a `slot` item's node).
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
 * Toolbar icon button (zoom, help and every `command` item).
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

	/* Restates the disabled color for the icon: the rule above pins the svg's
	   color, so the one on :disabled never reaches it by inheritance. */
	&:disabled svg,
	&:disabled:hover svg {
		color: ${theme.disabledForeground};
	}
`;

/**
 * Toolbar toggle button for a panel that stays open (either sidebar, or both
 * through the one switch).
 *
 * Sized like ToolbarIconButton, but takes the pressed look of a category button
 * while its panel is open so the bar shows what is currently on screen.
 */
export const ToolbarToggleButton = styled.button<{ isOpen: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 1px solid ${(props) => (props.isOpen ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${(props) =>
		props.isOpen ? theme.surfaceActive : "transparent"};
	color: ${theme.iconForeground};
	line-height: 1;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
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
	font-size: 12px;
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
