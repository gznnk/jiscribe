import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * Stadium outline (centered): fully rounded rectangle (corner radius = half the
 * short side). Renderer draws `<rect rx>` with the same radius.
 */
export const stadiumOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcRoundedRectOutline(width, height, Math.min(width, height) / 2);
