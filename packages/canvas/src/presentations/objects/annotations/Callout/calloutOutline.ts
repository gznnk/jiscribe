import { CALLOUT_TAIL_RATIO } from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";

/**
 * Callout outline (centered): rectangular bubble body + a downward-left tail.
 * All straight edges. Renderer draws the equivalent path (buildCalloutPath).
 */
export const calloutOutline: ShapeOutlineProvider = ({ width, height }) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const bodyBottom = -halfHeight + height * (1 - CALLOUT_TAIL_RATIO);
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		{ x: halfWidth, y: bodyBottom },
		{ x: -halfWidth + width * 0.45, y: bodyBottom },
		{ x: -halfWidth + width * 0.2, y: halfHeight },
		{ x: -halfWidth + width * 0.25, y: bodyBottom },
		{ x: -halfWidth, y: bodyBottom },
	];
};
