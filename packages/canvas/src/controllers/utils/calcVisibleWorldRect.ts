import type { Rect } from "@jiscribe/geometry";

import type { Viewport } from "../../states/canvas/Viewport";

/**
 * The part of the world the view shows: the camera's top-left corner and the
 * container's measured size divided by the zoom.
 *
 * @param viewport - The live viewport; before the container has been measured
 *   its size is 0, and so is the rect's
 * @returns The visible rect in world coordinates
 */
export const calcVisibleWorldRect = ({
	minX,
	minY,
	width,
	height,
	zoom,
}: Viewport): Rect => ({
	x: minX,
	y: minY,
	width: width / zoom,
	height: height / zoom,
});
