import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { cardOutlinePoints } from "../../schema/card/cardOutline";

export const buildCardPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(cardOutlinePoints(x, y, width, height));
