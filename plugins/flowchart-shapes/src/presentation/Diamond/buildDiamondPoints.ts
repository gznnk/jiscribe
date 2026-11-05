import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { diamondOutlinePoints } from "../../schema/diamond/diamondOutline";

export const buildDiamondPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(diamondOutlinePoints(x, y, width, height));
