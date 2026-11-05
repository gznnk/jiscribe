import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { trapezoidOutlinePoints } from "../../schema/trapezoid/trapezoidOutline";

export const buildTrapezoidPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(trapezoidOutlinePoints(x, y, width, height));
