import { isFrame, roundToDecimal, type Frame } from "@workspace/geometry";

import type {
	DragEventHandler,
	DragEventHandlerParams,
} from "../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Helper type for ObjectState that has Frame properties
 */
type FrameObjectState = ObjectState & Frame;

/**
 * Frame-specific drag event handler that updates an object's position.
 * Also moves all other selected Frame objects by the same delta.
 * Returns the entire CanvasState with the updated objects.
 * Only handles left-click drag (button 0).
 */
export const FrameDragEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { delta, objectState, canvasState, button } = params;

	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	if (!isFrame(objectState)) {
		return canvasState;
	}

	// Ensure we have eventStartState to reference original positions
	const eventStartObjects = canvasState.eventStartState?.objects;
	if (!eventStartObjects) {
		return canvasState;
	}

	// Get all selected object IDs
	const selectedIds = canvasState.selectedIds;

	// Update all selected objects
	const updatedObjects = { ...eventStartObjects };

	for (const selectedId of selectedIds) {
		const selectedObject = eventStartObjects[selectedId];
		if (!selectedObject || !isFrame(selectedObject)) {
			continue;
		}

		updatedObjects[selectedId] = {
			...selectedObject,
			cx: roundToDecimal(selectedObject.cx + delta.x),
			cy: roundToDecimal(selectedObject.cy + delta.y),
		} as FrameObjectState;
	}

	// Update the canvas state with all moved objects
	return {
		...canvasState,
		objects: updatedObjects,
	};
};

/**
 * Drag start event handler that updates selection state based on modifiers.
 * - If Ctrl (or Meta on Mac) is pressed: adds the dragged object to selectedIds
 * - Otherwise: sets selectedIds to only the dragged object
 * Then calls FrameDragEventHandler to update the object's position.
 * Only handles left-click drag (button 0).
 */
export const FrameDragStartEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { objectState, canvasState, mods, button } = params;
	const { id } = objectState;

	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	// Check if Ctrl or Meta (Cmd on Mac) is pressed for additive selection
	const isAdditive = mods.ctrl || mods.meta;

	// Update selection based on modifiers
	let selectedIds: string[];
	if (isAdditive) {
		// Ctrl/Meta pressed: add to selection if not already selected
		selectedIds = canvasState.selectedIds.includes(id)
			? canvasState.selectedIds
			: [...canvasState.selectedIds, id];
	} else {
		// No Ctrl/Meta: select only this object
		selectedIds = [id];
	}

	// Update canvas state with new selection and enable edge scrolling
	const nextState = {
		...canvasState,
		selectedIds,
		edgeScrollEnabled: true,
	};

	// Call Frame handler to update object position
	return FrameDragEventHandler({
		...params,
		canvasState: nextState,
	});
};

/**
 * Drag end event handler that disables edge scrolling.
 * Then calls FrameDragEventHandler to finalize the object's position.
 */
export const FrameDragEndEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	// Disable edge scrolling on drag end
	const nextState = {
		...params.canvasState,
		edgeScrollEnabled: false,
	};

	return FrameDragEventHandler({
		...params,
		canvasState: nextState,
	});
};
