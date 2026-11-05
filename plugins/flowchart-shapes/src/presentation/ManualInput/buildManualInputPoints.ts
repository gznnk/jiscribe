import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { manualInputOutlinePoints } from "../../schema/manualInput/manualInputOutline";

export const buildManualInputPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(manualInputOutlinePoints(x, y, width, height));
