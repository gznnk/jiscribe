import { CALLOUT_TAIL_RATIO } from "../../../../schemas/objects/annotations/callout/CalloutDoc";

/**
 * Builds the callout path (bubble body + tail pointing down-left) for a
 * bounding box whose top-left corner is at (x, y). The tail occupies the
 * bottom CALLOUT_TAIL_RATIO band, so the whole silhouette stays inside the
 * bounding box. Shared by the object renderer (centered origin) and the
 * draw-drag preview.
 */
export const buildCalloutPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const bodyBottom = y + height * (1 - CALLOUT_TAIL_RATIO);
	return (
		`M ${x} ${y} H ${x + width} V ${bodyBottom} ` +
		`H ${x + width * 0.45} L ${x + width * 0.2} ${y + height} ` +
		`L ${x + width * 0.25} ${bodyBottom} H ${x} Z`
	);
};
