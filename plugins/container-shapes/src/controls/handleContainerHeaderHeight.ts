import { createCowObjects, PRECISION } from "@workspace/canvas/unstable";
import type {
	CanvasControllerState,
	CanvasEvent,
} from "@workspace/canvas/unstable";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import { CONTAINER_MIN_HEADER_HEIGHT } from "../schema/ContainerDoc";
import type { ContainerState } from "../state/ContainerState";

/**
 * Handles the container header-height control (dragging the header divider).
 *
 * Target format: data-id=<objectId>, data-part="selection:container:headerHeight"
 * Registered via the container's ObjectTypeDefinition.selectionControls.
 */
export const handleContainerHeaderHeight = (
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState => {
	const objectId = event.targetId;
	if (!objectId) {
		return state;
	}

	if (event.type === "dragStart") {
		return {
			...state,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}
	if (event.type === "drag") {
		return applyHeaderHeightDrag(state, event, objectId);
	}
	if (event.type === "dragEnd") {
		// Apply the drag-time update as is; the container's geometry is
		// unchanged, so no group-bounds refresh is needed.
		return {
			...applyHeaderHeightDrag(state, event, objectId),
			edgeScrollEnabled: false,
		};
	}

	return state;
};

/**
 * Converts the cursor into the container's local space and derives the new
 * header height from its distance to the top edge, clamped to
 * [CONTAINER_MIN_HEADER_HEIGHT, height].
 */
const applyHeaderHeightDrag = (
	state: CanvasControllerState,
	event: CanvasEvent,
	objectId: string,
): CanvasControllerState => {
	const eventStartSnapshot = state.eventStartSnapshot;
	if (!eventStartSnapshot) {
		return state;
	}

	const startObject = eventStartSnapshot.objects[objectId];
	if (!startObject || startObject.type !== "container") {
		return state;
	}
	const startContainer = startObject as ContainerState;

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

	// COW view over the previous frame's map (rebased internally, #213)
	const updatedContainer: ContainerState = {
		...startContainer,
		headerHeight: newHeaderHeight,
	};
	const updatedObjects = createCowObjects(state.objects);
	updatedObjects[objectId] = updatedContainer;

	return { ...state, objects: updatedObjects };
};
