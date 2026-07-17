import { calcCalloutPolygon } from "./calloutTailGeometry";
import type { CalloutTail } from "../../../../schemas/objects/annotations/callout/CalloutDoc";

/**
 * Builds the callout path (bubble body + tail) for a bounding box whose
 * top-left corner is at (x, y). Geometry comes from calcCalloutPolygon; shared
 * by the object renderer (centered origin) and the draw-drag preview.
 */
export const buildCalloutPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	tail: CalloutTail,
): string => {
	const points = calcCalloutPolygon(x, y, width, height, tail);
	return `${points
		.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
		.join(" ")} Z`;
};
