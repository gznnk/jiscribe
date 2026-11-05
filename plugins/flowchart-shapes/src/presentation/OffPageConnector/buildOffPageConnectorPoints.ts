import { formatPolygonPoints } from "@jiscribe/canvas-sdk";

import { offPageConnectorOutlinePoints } from "../../schema/offPageConnector/offPageConnectorOutline";

export const buildOffPageConnectorPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string =>
	formatPolygonPoints(offPageConnectorOutlinePoints(x, y, width, height));
