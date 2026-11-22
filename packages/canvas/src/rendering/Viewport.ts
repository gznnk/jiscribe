/** The world rectangle the canvas shows, and the pixel box it is shown in. */
export type Viewport = {
	/** World x of the view's left edge. */
	minX: number;
	/** World y of the view's top edge. */
	minY: number;
	/** Container width in CSS px, as measured (not a world length). */
	width: number;
	/** Container height in CSS px, as measured (not a world length). */
	height: number;
	/** World → px scale; 1 draws a world unit as one CSS px. */
	zoom: number;
};

/**
 * The size and `viewBox` an SVG showing `viewport` takes, so world coordinates
 * drawn in it land on the screen where the viewport says. The canvas SVG
 * (CanvasView) and the SVG laid over the text editors (CanvasFrontSvg) both
 * take theirs from here, which is what keeps the two on the same pixels.
 *
 * @param viewport - The view to show; `zoom` is the world → screen scale, above 0
 * @returns `width` / `height` in screen px and the `viewBox` string in world units
 */
export const calcViewportSvgBox = (
	viewport: Viewport,
): { width: number; height: number; viewBox: string } => {
	const { minX, minY, width, height, zoom } = viewport;
	return {
		width,
		height,
		viewBox: `${minX} ${minY} ${width / zoom} ${height / zoom}`,
	};
};
