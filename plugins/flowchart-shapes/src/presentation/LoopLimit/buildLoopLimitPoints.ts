import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { loopLimitOutlinePoints } from "../../schema/loopLimit/loopLimitOutline";

export const buildLoopLimitPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(loopLimitOutlinePoints(x, y, width, height));
