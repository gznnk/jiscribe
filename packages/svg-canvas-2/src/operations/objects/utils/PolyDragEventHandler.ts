import { roundToDecimal } from "@workspace/geometry";

import type {
	DragEventHandler,
	DragEventHandlerParams,
} from "../../../registry/ObjectRegistryTypes";
import { isPoly, type Poly } from "../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Helper type for ObjectState that has Poly properties
 */
type PolyObjectState = ObjectState & Poly;

/**
 * Poly-specific drag event handler that updates all points in the points array.
 * Also moves all other selected Poly objects by the same delta.
 * Returns the entire CanvasState with the updated objects.
 * Only handles left-click drag (button 0).
 */
export const PolyDragEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	const { delta, objectState, canvasState, button } = params;

	// Only handle left-click drag (button 0)
	if (button !== 0) {
		return canvasState;
	}

	if (!isPoly(objectState)) {
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
		if (!selectedObject || !isPoly(selectedObject)) {
			continue;
		}

		// Update all points by adding delta
		const updatedPoints = selectedObject.points.map((point) => ({
			x: roundToDecimal(point.x + delta.x),
			y: roundToDecimal(point.y + delta.y),
		}));

		updatedObjects[selectedId] = {
			...selectedObject,
			points: updatedPoints,
		} as PolyObjectState;
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
 * Then calls PolyDragEventHandler to update the object's position.
 * Only handles left-click drag (button 0).
 */
export const PolyDragStartEventHandler: DragEventHandler<ObjectState> = (
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

	// Call Poly handler to update object position
	return PolyDragEventHandler({
		...params,
		canvasState: nextState,
	});
};

/**
 * Drag end event handler that disables edge scrolling.
 * Then calls PolyDragEventHandler to finalize the object's position.
 */
export const PolyDragEndEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	// Disable edge scrolling on drag end
	const nextState = {
		...params.canvasState,
		edgeScrollEnabled: false,
	};

	return PolyDragEventHandler({
		...params,
		canvasState: nextState,
	});
};
