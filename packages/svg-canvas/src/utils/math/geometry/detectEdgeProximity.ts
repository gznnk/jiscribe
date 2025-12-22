import { AUTO_SCROLL_THRESHOLD } from "../../../constants/core/Constants";
import type { SvgViewport } from "../../../types/core/SvgViewport";

/**
 * Result type for edge proximity detection.
 */
export type EdgeProximityResult = {
	/** Whether the cursor is near any edge */
	isNearEdge: boolean;
	/** Horizontal edge proximity ("left" | "right" | null) */
	horizontal: "left" | "right" | null;
	/** Vertical edge proximity ("top" | "bottom" | null) */
	vertical: "top" | "bottom" | null;
};

/**
 * Detects if the cursor is near the edges of the canvas viewport.
 *
 * @param viewport - SVG viewport information
 * @param cursorX - Cursor X position in SVG coordinates
 * @param cursorY - Cursor Y position in SVG coordinates
 * @returns Object containing edge proximity information
 */
export const detectEdgeProximity = (
	viewport: SvgViewport,
	cursorX: number,
	cursorY: number,
): EdgeProximityResult => {
	const { zoom, minX, minY, containerWidth, containerHeight } = viewport;

	// Convert cursor position to screen space by multiplying with zoom
	const cursorScreenX = cursorX * zoom;
	const cursorScreenY = cursorY * zoom;

	// Calculate distances from each edge in screen space
	const distFromLeft = cursorScreenX - minX;
	const distFromTop = cursorScreenY - minY;
	const distFromRight = minX + containerWidth - cursorScreenX;
	const distFromBottom = minY + containerHeight - cursorScreenY;

	// Determine which edges the cursor is close to
	let horizontal: "left" | "right" | null = null;
	let vertical: "top" | "bottom" | null = null;

	// Check horizontal edges
	if (distFromLeft < AUTO_SCROLL_THRESHOLD) {
		horizontal = "left";
	} else if (distFromRight < AUTO_SCROLL_THRESHOLD) {
		horizontal = "right";
	}

	// Check vertical edges
	if (distFromTop < AUTO_SCROLL_THRESHOLD) {
		vertical = "top";
	} else if (distFromBottom < AUTO_SCROLL_THRESHOLD) {
		vertical = "bottom";
	}

	const isNearEdge = horizontal !== null || vertical !== null;

	return {
		isNearEdge,
		horizontal,
		vertical,
	};
};
