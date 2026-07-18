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

/**
 * Wrapper anchoring a category flyout to its button.
 * `position: relative` lets the absolutely-positioned flyout hang below.
 */
export const ShapeCategoryContainer = styled.div`
	position: relative;
	display: flex;
`;

/**
 * Category button in the ShapeLibrary. Unlike a shape item it is a plain menu
 * toggle (opt out of the gesture system with `data-gesture="none"`), so its
 * cursor is a pointer and it shows a small caret to signal the flyout.
 */
export const ShapeCategoryButton = styled.button<{ isOpen?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 2px;
	height: 32px;
	padding: 0 4px 0 6px;
	border-radius: ${theme.radius};
	border: 1px solid ${(props) => (props.isOpen ? theme.accent : "transparent")};
	background: ${(props) =>
		props.isOpen ? theme.surfaceActive : "transparent"};
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
 * Flyout panel dropped below a category button, containing that category's shape
 * items in a wrapping grid. Floats above the canvas.
 *
 * Uses flex-wrap (not a fixed-column grid) with `width: max-content` so the box
 * hugs its items — a 2-item category stays narrow — while `max-width` caps each
 * row at 5 items before wrapping. Items are 34px wide (32 + 1px border each
 * side, content-box), so 5×34 + 4×2 gap + 2×6 padding = 190.
 */
export const ShapeCategoryFlyout = styled.div`
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	z-index: 20;
	box-sizing: border-box;
	display: flex;
	flex-wrap: wrap;
	width: max-content;
	max-width: 190px;
	gap: 2px;
	padding: 6px;
	border-radius: ${theme.radius};
	border: 1px solid ${theme.border};
	background: ${theme.surface};
	box-shadow: ${theme.shadow};
`;
