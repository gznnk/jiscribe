import type { SelectionControlProps } from "@jiscribe/canvas";
import { SelectionControlPill } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import {
	calcCalloutTailTipPoint,
	isVerticalTailSide,
	resolveCalloutTail,
} from "../presentation/Callout";
import type { CalloutState } from "../state/callout/CalloutState";

/**
 * Handle for dragging the callout's tail tip. Free 2D drag; the handler
 * normalizes the pointer into tail side + position. Rendered as a pill on the
 * bounding-box edge the tail sits on, oriented along that edge.
 *
 * data-kind="control" + data-id=<objectId> + data-part={part}
 * (part comes from the selectionControls registration via SelectionControlsLayer).
 */
const CalloutTailTipControlComponent: React.FC<
	SelectionControlProps<CalloutState>
> = ({ object, zoom, part }) => {
	const { id, cx, cy, width, height, rotation, scaleX, scaleY } = object;

	const tail = resolveCalloutTail(object);
	const tipLocalPoint = calcCalloutTailTipPoint(width, height, tail);
	const radians = degreesToRadians(rotation);
	const handlePoint = calcAffineTransformedPoint(
		tipLocalPoint.x,
		tipLocalPoint.y,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	return (
		<SelectionControlPill
			cx={handlePoint.x}
			cy={handlePoint.y}
			rotation={rotation + (isVerticalTailSide(tail.side) ? 90 : 0)}
			zoom={zoom}
			objectId={id}
			part={part}
			cursor="move"
		/>
	);
};

export const CalloutTailTipControl = memo(CalloutTailTipControlComponent);
