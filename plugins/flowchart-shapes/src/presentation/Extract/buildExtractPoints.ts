import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { extractOutlinePoints } from "../../schema/extract/extractOutline";

export const buildExtractPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(extractOutlinePoints(x, y, width, height));
