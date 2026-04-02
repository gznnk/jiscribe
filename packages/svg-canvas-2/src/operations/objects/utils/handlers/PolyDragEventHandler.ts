import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../constants/precision";
import type {
	DragEventHandler,
	DragEventHandlerParams,
} from "../../../../registry/ObjectRegistryTypes";
import { isPoly, type Poly } from "../../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import { determineSelection } from "../determineSelection";
import { getAncestors } from "../getAncestors";
import { updateDescendantsRecursively } from "../updateDescendantsRecursively";

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
		if (!selectedObject) {
			continue;
		}

		if (selectedObject.type === "group") {
			// Group: update all descendants recursively
			// Note: Groups don't have position (geometry: "none"), only children move
			const group = selectedObject as GroupState;

			updateDescendantsRecursively(
				group.childIds,
				eventStartObjects,
				updatedObjects,
				delta,
			);
		} else if (isPoly(selectedObject)) {
			// Poly object: update all points
			const updatedPoints = selectedObject.points.map((point) => ({
				x: roundToDecimal(point.x + delta.x, PRECISION.COORDINATE),
				y: roundToDecimal(point.y + delta.y, PRECISION.COORDINATE),
			}));

			updatedObjects[selectedId] = {
				...selectedObject,
				points: updatedPoints,
			} as PolyObjectState;
		}
	}

	// Update the canvas state with all moved objects
	return {
		...canvasState,
		objects: updatedObjects,
	};
};

/**
 * Drag start event handler that updates selection state using hierarchical logic.
 * - If the dragged object is already selected: maintains current selection
 * - If the dragged object is not selected: uses determineSelection for hierarchical logic
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

	// Check if this object or any of its ancestors are already selected
	const isCurrentlySelected = canvasState.selectedIds.includes(id);
	const ancestors = getAncestors(canvasState, id);
	const isAncestorSelected = ancestors.some((ancestorId) =>
		canvasState.selectedIds.includes(ancestorId),
	);

	let selectedIds: string[];

	if (isCurrentlySelected || isAncestorSelected) {
		// Already selected (or ancestor is selected): maintain current selection
		// (allows dragging multiple selected items and grouped items)
		selectedIds = canvasState.selectedIds;
	} else {
		// Not selected: use hierarchical selection logic
		const newSelection = determineSelection(objectState, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selectedIds;
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
