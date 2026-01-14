import { isFrame, type Frame } from "@workspace/geometry";

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
 * Default drag event handler that updates an object's position.
 * Also moves all other selected objects by the same delta.
 * Returns the entire CanvasState with the updated objects.
 */
export const DefaultDragEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { delta, objectState, canvasState } = params;

	if (!isFrame(objectState)) {
		return canvasState;
	}

	// Get all selected object IDs
	const selectedIds = canvasState.selectedIds;

	// Update all selected objects
	const updatedObjects = { ...canvasState.objects };

	for (const selectedId of selectedIds) {
		const selectedObject = canvasState.objects[selectedId];
		if (!selectedObject || !isFrame(selectedObject)) {
			continue;
		}

		// Cast to FrameObjectState after isFrame check
		const frameObject = selectedObject as FrameObjectState;
		const updatedFrameObject: FrameObjectState = {
			...frameObject,
			cx: frameObject.cx + delta.x,
			cy: frameObject.cy + delta.y,
		};
		updatedObjects[selectedId] = updatedFrameObject;
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
 * Then calls DefaultDragEventHandler to update the object's position.
 */
export const DefaultDragStartEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { objectState, canvasState, mods } = params;
	const { id } = objectState;

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

	// Update canvas state with new selection
	const stateWithSelection = {
		...canvasState,
		selectedIds,
	};

	// Call default handler to update object position
	return DefaultDragEventHandler({
		...params,
		canvasState: stateWithSelection,
	});
};
