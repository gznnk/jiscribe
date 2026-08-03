import type { SelectionControlProps } from "@workspace/canvas";
import { SelectionControlPill } from "@workspace/canvas/unstable";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import { memo } from "react";

import {
	calcBraceTip,
	isVerticalBrace,
	resolveBraceDirection,
	resolveBraceTipPosition,
} from "../presentation/Brace";
import type { BraceState } from "../state/brace/BraceState";

/**
 * Handle for dragging the brace's tip. Free 2D drag; the handler normalizes the
 * pointer into direction + tipPosition. Rendered as a pill on the bounding-box
 * edge the tip sits on, oriented along that edge.
 *
 * data-kind="control" + data-id=<objectId> + data-part={part}
 * (part comes from the selectionControls registration via SelectionControlsLayer).
 */
const BraceTipControlComponent: React.FC<SelectionControlProps<BraceState>> = ({
	object,
	zoom,
	part,
}) => {
	const { id, cx, cy, width, height, rotation, scaleX, scaleY } = object;

	const direction = resolveBraceDirection(object);
	const tipLocalPoint = calcBraceTip(
		-width / 2,
		-height / 2,
		width,
		height,
		direction,
		resolveBraceTipPosition(object),
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
			rotation={rotation + (isVerticalBrace(direction) ? 90 : 0)}
			zoom={zoom}
			objectId={id}
			part={part}
			cursor="move"
		/>
	);
};

export const BraceTipControl = memo(BraceTipControlComponent);
