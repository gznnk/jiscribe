/**
 * SvgViewport type definition
 * Represents the viewport of the SVG canvas, including its position, size, and zoom level.
 */
export type SvgViewport = {
	minX: number;
	minY: number;
	containerWidth: number;
	containerHeight: number;
	zoom: number;
};
