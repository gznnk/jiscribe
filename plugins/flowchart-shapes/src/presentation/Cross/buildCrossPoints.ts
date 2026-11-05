import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { crossOutlinePoints } from "../../schema/cross/crossOutline";

export const buildCrossPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(crossOutlinePoints(x, y, width, height));
