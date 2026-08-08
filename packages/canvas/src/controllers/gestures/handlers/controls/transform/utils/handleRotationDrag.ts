import type { TransformedFrame } from "@workspace/geometry";
import {
	calcVectorAngleRad,
	isTransformedFrame,
	normalizeAngleDeg,
	radiansToDegrees,
	roundToDecimal,
} from "@workspace/geometry";

import { updateSingleGroupBounds } from "./updateSingleGroupBounds";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { rotateChildren } from "../../../../../behaviors/primitives/GroupController";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../../registries/ICanvasRegistries";
import { createCowObjects } from "../../../../../utils/cowObjects";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";

/**
 * Handles dragging on the rotation anchor (rotation handle).
 */
export function handleRotationDrag(
	state: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const eventStartSnapshot = state.eventStartSnapshot;
	if (!eventStartSnapshot) {
		return state;
	}

	// Determine the target frame (multiSelectGroup for multi-selection, the selected object for single selection)
	let startFrame: TransformedFrame | null = null;
	let selectedId: string | null = null;
	const isMultiSelect = state.selectedIds.length > 1;

	if (isMultiSelect) {
		// For multi-selection, use multiSelectGroup
		const multiSelectGroup = eventStartSnapshot.multiSelectGroup;
		if (multiSelectGroup && isTransformedFrame(multiSelectGroup)) {
			startFrame = multiSelectGroup;
		}
	} else if (state.selectedIds.length === 1) {
		// For single selection
		selectedId = state.selectedIds[0];
		const startObject = eventStartSnapshot.objects[selectedId];
		if (startObject && isTransformedFrame(startObject)) {
			startFrame = startObject;
		}
	}

	if (!startFrame) {
		return state;
	}

	// Cursor position in world space
	const cursorX = event.last.x;
	const cursorY = event.last.y;

	// Compute the angle of the vector from the center point to the cursor
	const radian = calcVectorAngleRad(
		cursorX,
		cursorY,
		startFrame.cx,
		startFrame.cy,
	);

	// Compute the reference angle of the rotation point (toward the top-right)
	const rotatePointRadian = calcVectorAngleRad(
		startFrame.cx + startFrame.width,
		startFrame.cy - startFrame.height,
		startFrame.cx,
		startFrame.cy,
	);

	// Compute the new rotation angle (0-360 degrees, rounded to an integer)
	const newRotation = normalizeAngleDeg(
		roundToDecimal(radiansToDegrees(radian - rotatePointRadian), 0),
	);

	// Build the updated object map from eventStartSnapshot (COW view, #213)
	const updatedObjects = createCowObjects(eventStartSnapshot.objects);

	let nextState: CanvasControllerState;

	if (isMultiSelect) {
		// Multi-selection: rotate each selected object relative to multiSelectGroup
		const startGroup = startFrame as GroupState;
		const updatedGroup: GroupState = {
			...startGroup,
			rotation: newRotation,
		};

		const rotatedChildren = rotateChildren(
			startGroup,
			newRotation,
			updatedGroup,
			updatedObjects,
			registries.objectBehavior,
		);
		Object.assign(updatedObjects, rotatedChildren);

		// Update multiSelectGroup as well
		nextState = {
			...state,
			objects: updatedObjects,
			multiSelectGroup: updatedGroup,
		};

		// Parent group updates are not done during drag (done on dragEnd)
	} else {
		// Single selection: rotate the selected object itself
		if (!selectedId) {
			return state;
		}

		const startObject = eventStartSnapshot.objects[selectedId];
		if (!startObject) {
			return state;
		}

		const updatedObject = {
			...startObject,
			rotation: newRotation,
		};
		updatedObjects[selectedId] = updatedObject;

		// If it is a group, also rotate the child objects
		if (updatedObject.type === "group") {
			const rotatedChildren = rotateChildren(
				startObject as GroupState,
				newRotation,
				updatedObject as GroupState,
				eventStartSnapshot.objects,
				registries.objectBehavior,
			);
			Object.assign(updatedObjects, rotatedChildren);
		}

		nextState = {
			...state,
			objects: updatedObjects,
		};

		// Only for a single group selection, update that group's own bounds (during drag).
		// Parent group updates happen on dragEnd.
		if (updatedObject.type === "group") {
			return updateSingleGroupBounds(nextState, selectedId);
		}
	}

	return nextState;
}
