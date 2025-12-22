import { MINIMAP_VIEWPORT_MARGIN } from "../../../constants/core/Constants";
import type { Bounds } from "../../../types/core/Bounds";
import type { Diagram } from "../../../types/state/core/Diagram";
import { calcDiagramsBoundingBox } from "../../../utils/math/geometry/calcDiagramsBoundingBox";

/**
 * Calculate viewport bounds in canvas coordinates based on current view state
 *
 * @param minX - The horizontal scroll offset of the viewport in pixels
 * @param minY - The vertical scroll offset of the viewport in pixels
 * @param containerWidth - The width of the viewport container in pixels
 * @param containerHeight - The height of the viewport container in pixels
 * @param zoom - The current zoom level (1.0 = 100%)
 * @returns Bounds object representing the viewport area in canvas coordinates
 */
export const calculateCanvasViewportBounds = (
	minX: number,
	minY: number,
	containerWidth: number,
	containerHeight: number,
	zoom: number,
): Bounds => {
	const viewportWidth = containerWidth / zoom;
	const viewportHeight = containerHeight / zoom;
	const viewportLeft = minX / zoom;
	const viewportTop = minY / zoom;

	return {
		x: viewportLeft,
		y: viewportTop,
		width: viewportWidth,
		height: viewportHeight,
	};
};

/**
 * Calculate combined canvas bounds including both items and viewport.
 * This ensures the minimap shows both content and current view area.
 *
 * @param items - Array of diagram items to calculate bounds for
 * @param viewportBounds - Current viewport bounds in canvas coordinates
 * @returns Combined bounds that encompass both items and viewport
 */
export const calculateCombinedCanvasBounds = (
	items: Diagram[],
	viewportBounds: Bounds,
): Bounds => {
	if (items.length === 0) {
		// If no items, use viewport bounds
		return viewportBounds;
	}

	// Calculate bounds of all items
	const itemBounds = calcDiagramsBoundingBox(items);

	// Combine item bounds with viewport bounds
	const combinedLeft = Math.min(itemBounds.left, viewportBounds.x);
	const combinedTop = Math.min(itemBounds.top, viewportBounds.y);
	const combinedRight = Math.max(
		itemBounds.right,
		viewportBounds.x + viewportBounds.width,
	);
	const combinedBottom = Math.max(
		itemBounds.bottom,
		viewportBounds.y + viewportBounds.height,
	);

	return {
		x: combinedLeft,
		y: combinedTop,
		width: combinedRight - combinedLeft,
		height: combinedBottom - combinedTop,
	};
};

/**
 * Constrain viewport position to stay within diagram bounds plus margin.
 * This prevents the viewport from moving too far away from diagram content.
 *
 * @param newMinX - Proposed new viewport X position in pixels
 * @param newMinY - Proposed new viewport Y position in pixels
 * @param items - Array of diagram items to calculate content bounds
 * @param containerWidth - The width of the viewport container in pixels
 * @param containerHeight - The height of the viewport container in pixels
 * @param zoom - The current zoom level (1.0 = 100%)
 * @param margin - Fixed margin in canvas units (default: MINIMAP_VIEWPORT_MARGIN)
 * @returns Constrained viewport position
 */
export const constrainViewportPosition = (
	newMinX: number,
	newMinY: number,
	items: Diagram[],
	containerWidth: number,
	containerHeight: number,
	zoom: number,
	margin = MINIMAP_VIEWPORT_MARGIN,
): { minX: number; minY: number } => {
	if (items.length === 0) {
		// If no items, don't constrain movement
		return { minX: newMinX, minY: newMinY };
	}

	// Calculate bounds of all items
	const itemBounds = calcDiagramsBoundingBox(items);

	// Calculate allowed bounds for viewport position using fixed margin
	const allowedLeft = (itemBounds.left - margin) * zoom;
	const allowedTop = (itemBounds.top - margin) * zoom;
	const allowedRight = (itemBounds.right + margin) * zoom - containerWidth;
	const allowedBottom = (itemBounds.bottom + margin) * zoom - containerHeight;

	// Constrain the proposed position
	const constrainedMinX = Math.max(
		allowedLeft,
		Math.min(allowedRight, newMinX),
	);
	const constrainedMinY = Math.max(
		allowedTop,
		Math.min(allowedBottom, newMinY),
	);

	return {
		minX: constrainedMinX,
		minY: constrainedMinY,
	};
};
