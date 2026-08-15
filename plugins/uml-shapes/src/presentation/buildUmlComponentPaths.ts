import {
	UML_COMPONENT_ICON_HEIGHT,
	UML_COMPONENT_ICON_INSET,
	UML_COMPONENT_ICON_TAB_GAP,
	UML_COMPONENT_ICON_TAB_HEIGHT,
	UML_COMPONENT_ICON_TAB_INSET,
	UML_COMPONENT_ICON_TAB_OVERHANG,
	UML_COMPONENT_ICON_TAB_WIDTH,
	UML_COMPONENT_ICON_WIDTH,
} from "../schema/UmlComponentDoc";

/** Rectangle as a closed subpath, clockwise from its top-left corner. */
const buildRectPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;

/**
 * The component's box, as a closed path.
 *
 * @param x - Left edge in local coordinates
 * @param y - Top edge in local coordinates
 * @param width - Box width; not clamped, so 0 yields a degenerate path
 * @param height - Box height
 * @returns A closed subpath, clockwise from the top-left corner
 */
export const buildUmlComponentBodyPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => buildRectPath(x, y, width, height);

/**
 * The component icon as three rectangles: its body, then the two tabs straddling
 * the body's left edge. Paint them in this order with the shape's own fill — the
 * tabs' fill is what hides the stretch of the body's left edge they cross, so the
 * mark reads as one outline without any of the paths being cut.
 *
 * @param right - The box's right edge in local coordinates; the icon hangs from it, UML_COMPONENT_ICON_INSET away
 * @param top - The box's top edge in local coordinates, the icon being inset from it by the same amount
 * @returns Three closed subpaths in paint order, body first
 */
export const buildUmlComponentIconPaths = (
	right: number,
	top: number,
): string[] => {
	const iconLeft = right - UML_COMPONENT_ICON_INSET - UML_COMPONENT_ICON_WIDTH;
	const iconTop = top + UML_COMPONENT_ICON_INSET;
	const tabLeft = iconLeft - UML_COMPONENT_ICON_TAB_OVERHANG;
	const upperTabTop = iconTop + UML_COMPONENT_ICON_TAB_INSET;
	const lowerTabTop =
		upperTabTop + UML_COMPONENT_ICON_TAB_HEIGHT + UML_COMPONENT_ICON_TAB_GAP;
	return [
		buildRectPath(
			iconLeft,
			iconTop,
			UML_COMPONENT_ICON_WIDTH,
			UML_COMPONENT_ICON_HEIGHT,
		),
		buildRectPath(
			tabLeft,
			upperTabTop,
			UML_COMPONENT_ICON_TAB_WIDTH,
			UML_COMPONENT_ICON_TAB_HEIGHT,
		),
		buildRectPath(
			tabLeft,
			lowerTabTop,
			UML_COMPONENT_ICON_TAB_WIDTH,
			UML_COMPONENT_ICON_TAB_HEIGHT,
		),
	];
};
