import { isFrame } from "@workspace/geometry";

import type {
	DragEventHandler,
	DragEventHandlerParams,
} from "../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Default drag event handler that updates an object's position.
 * Returns the entire CanvasState with the updated object.
 */
export const DefaultDragEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { delta, objectState, canvasState } = params;

	if (!isFrame(objectState)) {
		return canvasState;
	}
	const { cx, cy, id } = objectState;
	const updatedObjectState = {
		...objectState,
		cx: cx + delta.x,
		cy: cy + delta.y,
	};

	// Update the object in the canvas state
	return {
		...canvasState,
		objects: {
			...canvasState.objects,
			[id]: updatedObjectState,
		},
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
