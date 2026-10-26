import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";
import type { PinInsertionMark } from "../../../utils/pinnedCategoryOrder";
import { STENCIL_BUTTON_SIZE } from "../StencilLibrary/StencilLibraryStyled";

/** The rail's padding above its first button and below its last, in px. */
export const STENCIL_RAIL_PADDING = 8;

/** The gap between two neighbouring items of the rail, in px. */
export const STENCIL_RAIL_GAP = 4;

/** The thickness of a divider's line, solid or dashed, in px. */
const STENCIL_RAIL_DIVIDER_LINE = 1;

/** A divider's margin above and below its line, in px. */
const STENCIL_RAIL_DIVIDER_MARGIN = 4;

/** The height a divider takes in the rail's column, margins included, in px. */
export const STENCIL_RAIL_DIVIDER_EXTENT =
	STENCIL_RAIL_DIVIDER_LINE + 2 * STENCIL_RAIL_DIVIDER_MARGIN;

/**
 * Width of the rail in px: a stencil button with the padding either side. The
 * flyout over the canvas and the rail's popovers open at this offset, against
 * the rail.
 */
export const STENCIL_RAIL_WIDTH =
	STENCIL_BUTTON_SIZE + 2 * STENCIL_RAIL_PADDING;

/**
 * Holds the rail and the popovers it opens beside itself: a fixed-width flex
 * child at the left of the body row, left of the docked stencil panel and the
 * viewport. Positioned, so a popover is laid out against the rail; the rail
 * itself clips what does not fit, which a popover must not be.
 */
export const StencilRailRoot = styled.div`
	position: relative;
	flex: none;
	display: flex;
	flex-direction: column;
	width: ${STENCIL_RAIL_WIDTH}px;
	min-height: 0;
`;

/**
 * The stencil rail: a column taking the full height of the body row.
 *
 * It takes space rather than floating over the canvas. Its height is the row's,
 * never its content's (`min-height: 0`), which is what the rail measures to
 * decide what goes into its "…" button (resolveStencilRailOverflow); what still
 * does not fit is cut off (`overflow: hidden`) rather than scrolled.
 */
export const StencilRailContainer = styled.nav`
	flex: 1 1 auto;
	min-height: 0;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: ${STENCIL_RAIL_GAP}px;
	width: 100%;
	padding: ${STENCIL_RAIL_PADDING}px 0;
	overflow: hidden;
	background-color: ${theme.surface};
	border-right: 1px solid ${theme.border};
	user-select: none;
`;

/** Horizontal hairline between two groups of the rail (presets / pinned categories). */
export const StencilRailDivider = styled.div`
	flex: none;
	width: 20px;
	height: ${STENCIL_RAIL_DIVIDER_LINE}px;
	margin: ${STENCIL_RAIL_DIVIDER_MARGIN}px 0;
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
	margin: ${STENCIL_RAIL_DIVIDER_MARGIN}px 0;
	border-top: ${STENCIL_RAIL_DIVIDER_LINE}px dashed ${theme.borderSubtle};
`;

/** Pushes what follows it (the "…" button, the catalog button) to the bottom of the rail. */
export const StencilRailSpacer = styled.div`
	flex: 1 1 auto;
`;

/** Which gap beside an item a pin drag's line is drawn in: above it (`before`) or below it (`after`). */
type PinInsertionEdge = PinInsertionMark["edge"];

/** The accent line a pin drag draws in the gap beside an item (`position: relative` on the item). */
const pinInsertionMarkStyles = (edge: PinInsertionEdge | null): string =>
	edge === null
		? ""
		: `
	&::after {
		content: "";
		position: absolute;
		left: 2px;
		right: 2px;
		${edge === "before" ? "top" : "bottom"}: -3px;
		height: 2px;
		border-radius: 1px;
		background-color: ${theme.accent};
		pointer-events: none;
	}`;

/**
 * A rail button opening a stencil panel or a popover (a category, the catalog,
 * "…", the collapsed presets). Sized like the preset buttons, and
 * pressed-looking while what it opens is the one shown, flyout or docked, so
 * the rail tells what is on screen.
 */
export const StencilRailPanelButton = styled.button<{
	isOpen: boolean;
	pinInsertionEdge?: PinInsertionEdge | null;
}>`
	position: relative;
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: ${STENCIL_BUTTON_SIZE}px;
	height: ${STENCIL_BUTTON_SIZE}px;
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
	${(props) => pinInsertionMarkStyles(props.pinInsertionEdge ?? null)}
`;

/**
 * A popover the rail opens beside itself (the "…" list, the collapsed presets),
 * against the rail's right edge: at the top for the presets, at the bottom for
 * "…", next to the button that opened it. Above the drawing and the docked
 * panel, on the flyout's terms (StencilFlyoutLayer).
 */
export const StencilRailPopoverContainer = styled.div<{
	anchor: "top" | "bottom";
}>`
	position: absolute;
	left: 100%;
	${(props) => props.anchor}: ${STENCIL_RAIL_PADDING}px;
	z-index: 20;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	min-width: 200px;
	max-height: calc(100% - ${2 * STENCIL_RAIL_PADDING}px);
	margin-left: 4px;
	padding: 4px 0;
	overflow-y: auto;
	background: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
	user-select: none;
`;

/** Heading over one section of the "…" popover (pinned / in this diagram). */
export const StencilRailPopoverHeading = styled.div`
	padding: 6px 12px 2px;
	color: ${theme.foregroundMuted};
	font-size: 11px;
`;

/** One category of the "…" popover: the press opens it, as its rail button would. */
export const StencilRailPopoverRow = styled.button<{
	pinInsertionEdge?: PinInsertionEdge | null;
}>`
	position: relative;
	display: flex;
	flex: none;
	align-items: center;
	gap: 8px;
	height: 28px;
	padding: 0 12px 0 8px;
	border: none;
	background: transparent;
	color: ${theme.foreground};
	font-size: 12px;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	svg {
		flex: none;
		color: ${theme.iconForeground};
	}
	${(props) => pinInsertionMarkStyles(props.pinInsertionEdge ?? null)}
`;

/**
 * Space a row of the "…" popover keeps at its start: the drag handle on a
 * pinned row, empty on the others so the icons line up.
 */
export const StencilRailPopoverRowGrip = styled.span`
	display: flex;
	flex: none;
	width: 12px;
	cursor: grab;
`;

/** The presets once collapsed out of the rail, in a grid like a panel's. */
export const StencilRailPopoverGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, ${STENCIL_BUTTON_SIZE}px);
	gap: 2px;
	padding: 4px 8px;
`;
