import { buildCalloutPath } from "./buildCalloutPath";
import { CALLOUT_TAIL_DEFAULT } from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { ShapePreviewRenderer } from "../../registry/ShapePreviewTypes";

/** Preview renderer for a Callout shape while it is being drawn. */
export const CalloutPreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	fill,
	strokeWidth,
}) => {
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);
	// Colors may contain var(--jiscribe-*) (the resolved result of auto), so apply them via style rather than SVG attributes.
	return (
		<path
			d={buildCalloutPath(x, y, width, height, CALLOUT_TAIL_DEFAULT)}
			style={{ fill, stroke }}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};
