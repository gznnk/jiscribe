import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * Stadium outline (centered): fully rounded rectangle (corner radius = half the
 * short side). Renderer draws `<rect rx>` with the same radius.
 */
export const stadiumOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcRoundedRectOutline(width, height, Math.min(width, height) / 2);
