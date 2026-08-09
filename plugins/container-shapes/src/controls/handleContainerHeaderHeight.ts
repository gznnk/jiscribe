import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { PRECISION } from "@jiscribe/canvas-sdk";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@jiscribe/geometry";

import { CONTAINER_MIN_HEADER_HEIGHT } from "../schema/ContainerDoc";
import type { ContainerState } from "../state/ContainerState";

/**
 * Handles the container header-height control (dragging the header divider).
 * Converts the cursor into the container's local space and derives the new
 * header height from its distance to the top edge, clamped to
 * [CONTAINER_MIN_HEADER_HEIGHT, height].
 *
 * Registered via the container's ObjectTypeDefinition.selectionControls.
 */
export const handleContainerHeaderHeight = (
	context: SelectionControlContext<ContainerState>,
	event: SelectionControlEvent,
): ContainerState => {
	const startContainer = context.startObject;

	const radians = degreesToRadians(startContainer.rotation);
	const localPoint = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startContainer.scaleX,
		startContainer.scaleY,
		radians,
		startContainer.cx,
		startContainer.cy,
	);

	// When height is below the minimum, the height-side clamp wins — but the
	// persisted value never goes below 1 (the doc validator / JSON schema
	// lower bound); rendering re-clamps to the box via calcContainerHeaderHeight.
	const newHeaderHeight = Math.max(
		roundToDecimal(
			Math.min(
				Math.max(
					localPoint.y + startContainer.height / 2,
					CONTAINER_MIN_HEADER_HEIGHT,
				),
				startContainer.height,
			),
			PRECISION.SIZE,
		),
		1,
	);

	return { ...startContainer, headerHeight: newHeaderHeight };
};
