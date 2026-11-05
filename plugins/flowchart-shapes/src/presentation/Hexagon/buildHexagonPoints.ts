import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { hexagonOutlinePoints } from "../../schema/hexagon/hexagonOutline";

export const buildHexagonPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(hexagonOutlinePoints(x, y, width, height));
