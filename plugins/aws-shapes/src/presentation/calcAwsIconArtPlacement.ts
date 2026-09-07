/** Where in the box an icon's drawing goes, and at what size. */
export type AwsIconArtPlacement = {
	/** Factor the asset's viewBox is scaled by, the same on both axes, so a non-square box gains margin. 0 for a box with no area */
	scale: number;
	/** Left edge of the scaled drawing, in local coordinates (the shape's centre is the origin) */
	offsetX: number;
	/** Top edge of the scaled drawing, in local coordinates (the shape's centre is the origin) */
	offsetY: number;
};

/**
 * Works out the transform that fits an asset's viewBox into the box uniformly
 * and centres it.
 *
 * @param width - box width in local px; 0 or less draws nothing
 * @param height - box height in local px; 0 or less draws nothing
 * @param viewBoxWidth - the asset's viewBox width, 40 / 48 / 64 depending on the
 *   layer; 0 or less draws nothing (which is what an unreadable viewBox gives)
 * @param viewBoxHeight - the asset's viewBox height; 0 or less draws nothing
 * @returns the placement; a `scale` of 0 tells the drawing side to draw nothing
 */
export const calcAwsIconArtPlacement = (
	width: number,
	height: number,
	viewBoxWidth: number,
	viewBoxHeight: number,
): AwsIconArtPlacement => {
	if (!(viewBoxWidth > 0) || !(viewBoxHeight > 0)) {
		return { scale: 0, offsetX: 0, offsetY: 0 };
	}
	const scale = Math.min(width / viewBoxWidth, height / viewBoxHeight);
	if (!(scale > 0)) {
		return { scale: 0, offsetX: 0, offsetY: 0 };
	}
	return {
		scale,
		offsetX: -(viewBoxWidth * scale) / 2,
		offsetY: -(viewBoxHeight * scale) / 2,
	};
};

/**
 * Reads the width and height out of a viewBox string (`"0 0 64 64"`).
 *
 * @param viewBox - the asset's viewBox: the four numbers `min-x min-y width height`
 * @returns the width and height, or 0 for whatever does not read as a number
 *   (which gives the caller a placement that draws nothing)
 */
export const readViewBoxSize = (
	viewBox: string,
): { width: number; height: number } => {
	const [, , width, height] = viewBox.trim().split(/\s+/).map(Number);
	return {
		width: Number.isFinite(width) ? width : 0,
		height: Number.isFinite(height) ? height : 0,
	};
};
