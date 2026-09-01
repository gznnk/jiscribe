import { ICON_GRID_SIZE } from "../schema/IconDoc";

/** Where and how large an icon's line art is drawn inside the shape's box. */
export type IconArtPlacement = {
	/**
	 * Factor the icon's own 24x24 grid is multiplied by. Uniform on both axes, so a
	 * non-square box shows margin rather than a stretched icon. 0 for a box with no
	 * area, where nothing is drawn.
	 */
	scale: number;
	/**
	 * Left and top of the scaled grid in local coordinates (the shape's centre as
	 * origin), which centres the art in the box.
	 */
	offset: number;
	/**
	 * Stroke width to hand the art. Scaling the grid would scale its strokes with it,
	 * so this is divided by {@link scale} to come back out at the width asked for.
	 * 0 when nothing is drawn.
	 */
	artStrokeWidth: number;
};

/**
 * Works out the transform and stroke width the line art is drawn with, so the icon
 * fills the box without its stroke thickening as the box grows.
 *
 * @param width - Box width in local pixels; 0 or negative means nothing is drawn
 * @param height - Box height in local pixels; 0 or negative means nothing is drawn
 * @param strokeWidth - Line weight asked for, as it should appear on screen; the
 *   caller resolves an absent document value to DEFAULT_ICON_STROKE_WIDTH first,
 *   so 0 here is an explicit request for unstroked art
 * @returns The placement; `scale` 0 marks the degenerate box a renderer skips
 */
export const calcIconArtPlacement = (
	width: number,
	height: number,
	strokeWidth: number,
): IconArtPlacement => {
	const scale = Math.min(width, height) / ICON_GRID_SIZE;
	if (!(scale > 0)) {
		return { scale: 0, offset: 0, artStrokeWidth: 0 };
	}
	return {
		scale,
		offset: -(ICON_GRID_SIZE * scale) / 2,
		artStrokeWidth: strokeWidth / scale,
	};
};
