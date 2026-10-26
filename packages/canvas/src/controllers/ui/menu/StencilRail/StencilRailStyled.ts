import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * Width of the rail in px: a 32px button (the toolbar's size) with 8px either
 * side. The flyout over the canvas opens at this offset, against the rail.
 */
export const STENCIL_RAIL_WIDTH = 48;

/**
 * The stencil rail: a fixed-width column at the left of the body row, left of
 * the docked stencil panel and the viewport.
 *
 * `flex: none` keeps it at its width while the viewport takes the rest; it
 * takes space rather than floating over the canvas. What does not fit its height
 * is cut off (`overflow: hidden`) rather than scrolled, which a 48px column has
 * no room for.
 */
export const StencilRailContainer = styled.nav`
	flex: none;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	width: ${STENCIL_RAIL_WIDTH}px;
	padding: 8px 0;
	overflow: hidden;
	background-color: ${theme.surface};
	border-right: 1px solid ${theme.border};
	user-select: none;
`;

/** Horizontal hairline between two groups of the rail (presets / pinned categories). */
export const StencilRailDivider = styled.div`
	flex: none;
	width: 20px;
	height: 1px;
	margin: 4px 0;
	background-color: ${theme.borderSubtle};
`;

/**
 * Dashed hairline above the categories the rail adds because the document uses
 * them, telling them from the pins above it (whose divider is solid).
 */
export const StencilRailDocumentDivider = styled.div`
	flex: none;
	width: 20px;
	height: 0;
	margin: 4px 0;
	border-top: 1px dashed ${theme.borderSubtle};
`;

/** Pushes what follows it (the catalog button) to the bottom of the rail. */
export const StencilRailSpacer = styled.div`
	flex: 1 1 auto;
`;

/**
 * A rail button opening a stencil panel (a category, or the catalog). Sized like
 * the preset buttons above it, and pressed-looking while its panel is the one
 * shown, flyout or docked, so the rail tells what is on screen.
 */
export const StencilRailPanelButton = styled.button<{ isOpen: boolean }>`
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
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
