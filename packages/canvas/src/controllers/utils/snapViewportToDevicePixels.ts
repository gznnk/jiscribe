import type { Viewport } from "../../states/canvas/Viewport";

/**
 * The camera moved onto the device pixel grid, for drawing only.
 *
 * Glyphs are rasterized on whole device pixels while a shape's outline is an SVG
 * path drawn wherever the geometry says, so the two only hold still against each
 * other while the scene's sub-pixel phase does not move. Panning by a fraction
 * of a pixel changes that phase, and the text creeps inside its own box (up to
 * ~0.9px, sawtoothing once per pixel of pan). Rounding the camera origin so that
 * `minX × zoom × devicePixelRatio` is whole freezes the phase: every shape keeps
 * whatever offset it had, and text and outline travel together.
 *
 * Drawing only — the committed camera keeps its exact value, so a run of
 * sub-pixel scroll deltas still accumulates into movement instead of each one
 * being rounded away. The rounding is idempotent, so the scene steps by a whole
 * device pixel at a time rather than sliding.
 *
 * Pointer input needs no matching change: it converts through the rendered
 * SVG's own `getScreenCTM`, which already carries the snapped viewBox.
 *
 * @param viewport - The committed camera, in world units
 * @param devicePixelRatio - Physical pixels per CSS pixel; a non-finite or
 *   non-positive value leaves the camera untouched
 * @returns A viewport with `minX` / `minY` snapped; `zoom` and the measured
 *   `width` / `height` are passed through
 */
export const snapViewportToDevicePixels = (
	viewport: Viewport,
	devicePixelRatio: number,
): Viewport => {
	const scale = viewport.zoom * devicePixelRatio;
	if (!Number.isFinite(scale) || scale <= 0) {
		return viewport;
	}
	return {
		...viewport,
		minX: Math.round(viewport.minX * scale) / scale,
		minY: Math.round(viewport.minY * scale) / scale,
	};
};
