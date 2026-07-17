import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@workspace/geometry";
import { memo } from "react";

import { calcContainerHeaderHeight } from "../../../../presentations/objects/containers/Container";
import type { ContainerState } from "../../../../states/objects/containers/container/ContainerState";
import type { SelectionControlProps } from "../../../registry/SelectionControlTypes";
import { getResizeCursorForRotation } from "../../utils/getResizeCursorForRotation";
import { SelectionControlPill } from "../SelectionControlPill";

/**
 * Handle for dragging the container's header divider to change headerHeight.
 * Rendered as a horizontal pill at the divider midpoint.
 *
 * data-kind="control" + data-id=<objectId> + data-part={part}
 * (part comes from HeaderHeightControlHandler via SelectionControlsLayer).
 */
const ContainerHeaderHeightControlComponent: React.FC<
	SelectionControlProps<ContainerState>
> = ({ object, zoom, part }) => {
	const { id, cx, cy, height, rotation, scaleX, scaleY } = object;

	const headerHeight = calcContainerHeaderHeight(object);
	const radians = degreesToRadians(rotation);
	// Divider midpoint (local: x=0, y=header bottom edge) in world coordinates
	const handlePoint = calcAffineTransformedPoint(
		0,
		-height / 2 + headerHeight,
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
			rotation={rotation}
			zoom={zoom}
			objectId={id}
			part={part}
			cursor={getResizeCursorForRotation(90, rotation, scaleX, scaleY)}
		/>
	);
};

export const ContainerHeaderHeightControl = memo(
	ContainerHeaderHeightControlComponent,
);
