import type { SelectionControlProps } from "@workspace/canvas";
import { SelectionControlPill } from "@workspace/canvas/unstable";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import { memo } from "react";

import {
	calcGroupMarkerTip,
	isVerticalGroupMarker,
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "../presentation/shared";
import type { GroupMarkerControlState } from "../state/shared/GroupMarkerControlState";

/**
 * Handle for dragging a group marker's tip. Free 2D drag; the handler normalizes
 * the pointer into direction (+ tipPosition, for the markers that have one).
 * Rendered as a pill on the bounding-box edge the tip sits on, oriented along
 * that edge — for a marker with no movable tip that is the middle of the edge,
 * since the position resolves to the default.
 *
 * data-kind="control" + data-id=<objectId> + data-part={part}
 * (part comes from the selectionControls registration via SelectionControlsLayer).
 */
const GroupMarkerTipControlComponent: React.FC<
	SelectionControlProps<GroupMarkerControlState>
> = ({ object, zoom, part }) => {
	const { id, cx, cy, width, height, rotation, scaleX, scaleY } = object;

	const direction = resolveGroupMarkerDirection(object);
	const tipLocalPoint = calcGroupMarkerTip(
		-width / 2,
		-height / 2,
		width,
		height,
		direction,
		resolveGroupMarkerTipPosition(object),
	);
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
			rotation={rotation + (isVerticalGroupMarker(direction) ? 90 : 0)}
			zoom={zoom}
			objectId={id}
			part={part}
			cursor="move"
		/>
	);
};

export const GroupMarkerTipControl = memo(GroupMarkerTipControlComponent);
