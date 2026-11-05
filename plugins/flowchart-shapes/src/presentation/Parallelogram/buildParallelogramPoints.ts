import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { parallelogramOutlinePoints } from "../../schema/parallelogram/parallelogramOutline";

export const buildParallelogramPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string =>
	formatPolygonPoints(parallelogramOutlinePoints(x, y, width, height));
