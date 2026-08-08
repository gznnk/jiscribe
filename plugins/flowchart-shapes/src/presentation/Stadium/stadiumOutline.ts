import type { ObjectOutlineCalculator } from "@workspace/canvas";
import { calcRoundedRectOutline } from "@workspace/canvas-sdk";
import type { Dimensions } from "@workspace/geometry";

/**
 * Stadium outline (centered): fully rounded rectangle (corner radius = half the
 * short side). Renderer draws `<rect rx>` with the same radius.
 */
export const stadiumOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcRoundedRectOutline(width, height, Math.min(width, height) / 2);
