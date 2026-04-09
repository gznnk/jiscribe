import { determineSelection } from "./determineSelection";
import { getAncestors } from "./getAncestors";
import { objectRegistry } from "../../../../../registry/ObjectRegistry";
import type {
	DragEventHandler,
	DragEventHandlerParams,
} from "../../../../../registry/ObjectRegistryTypes";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { updateAffectedGroupBounds } from "../../../../ui/utils/updateAffectedGroupBounds";
import { moveGroup } from "../primitives/GroupController";

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
			// Group: move the group and all its descendants recursively
			moveGroup(selectedId, eventStartObjects, updatedObjects, delta);
		} else {
			// Use registry to get the type-specific moveByDelta function
			const moveByDelta = objectRegistry.getMoveByDelta(selectedObject.type);
			if (moveByDelta) {
				updatedObjects[selectedId] = moveByDelta(selectedObject, delta);
			}
		}
	}

	// Create the next canvas state with all moved objects
	const nextState = {
		...canvasState,
		objects: updatedObjects,
	};

	// If multiple objects are selected, we may want to update the multiSelectGroup bounds as well
	const multiSelectGroup = canvasState.multiSelectGroup;
	const eventStartMultiSelectGroup =
		canvasState.eventStartState?.multiSelectGroup;
	if (multiSelectGroup && eventStartMultiSelectGroup) {
		// Move the multiSelectGroup by the same delta to keep it in sync with the moved objects
		nextState.multiSelectGroup = {
			...multiSelectGroup,
			cx: eventStartMultiSelectGroup.cx + delta.x,
			cy: eventStartMultiSelectGroup.cy + delta.y,
		};
	}

	// Update the canvas state with all moved objects
	return nextState;
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
 * Drag end event handler that disables edge scrolling and updates parent group bounds.
 * Updates the bounding frames of all parent groups affected by the drag operation.
 */
export const PolyDragEndEventHandler: DragEventHandler<ObjectState> = (
	params: DragEventHandlerParams<ObjectState>,
) => {
	// Disable edge scrolling on drag end
	const nextState = {
		...params.canvasState,
		edgeScrollEnabled: false,
	};

	// Finalize drag operation
	const resultState = PolyDragEventHandler({
		...params,
		canvasState: nextState,
	});

	// Update bounds of parent groups affected by the drag
	return updateAffectedGroupBounds(resultState, resultState.selectedIds);
};
