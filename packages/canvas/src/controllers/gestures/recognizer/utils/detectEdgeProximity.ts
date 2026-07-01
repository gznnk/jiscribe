import type { Viewport } from "../../../../states/canvas/Viewport";
import { AUTO_SCROLL_THRESHOLD } from "../GestureRecognizerConstants";

/**
 * Edge-proximity information.
 */
export type EdgeProximity = {
	isNearEdge: boolean;
	horizontal: "left" | "right" | null;
	vertical: "top" | "bottom" | null;
};

/**
 * Detects whether the cursor is near an edge of the viewport.
 *
 * @param viewport - The current viewport
 * @param svgX - Cursor X coordinate (SVG coordinates)
 * @param svgY - Cursor Y coordinate (SVG coordinates)
 * @returns Edge-proximity information
 */
export const detectEdgeProximity = (
	viewport: Viewport,
	svgX: number,
	svgY: number,
): EdgeProximity => {
	const { minX, minY, width, height, zoom } = viewport;

	// AUTO_SCROLL_THRESHOLD is in pixels, so convert it to the SVG coordinate system
	const thresholdInSvg = AUTO_SCROLL_THRESHOLD / zoom;

	// Calculate distances from each edge in SVG coordinates
	const distFromLeft = svgX - minX;
	const distFromTop = svgY - minY;
	const distFromRight = minX + width / zoom - svgX;
	const distFromBottom = minY + height / zoom - svgY;

	// Determine which edges the cursor is close to
	let horizontal: "left" | "right" | null = null;
	let vertical: "top" | "bottom" | null = null;

	// Check horizontal edges
	if (distFromLeft < thresholdInSvg) {
		horizontal = "left";
	} else if (distFromRight < thresholdInSvg) {
		horizontal = "right";
	}

	// Check vertical edges
	if (distFromTop < thresholdInSvg) {
		vertical = "top";
	} else if (distFromBottom < thresholdInSvg) {
		vertical = "bottom";
	}

	const isNearEdge = horizontal !== null || vertical !== null;

	return {
		isNearEdge,
		horizontal,
		vertical,
	};
};
