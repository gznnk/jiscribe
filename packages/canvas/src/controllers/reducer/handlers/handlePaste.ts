import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { cloneObjects } from "../../utils/cloneObjects";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";

const PASTE_OFFSET = { x: 20, y: 20 };

/**
 * Pastes clipboard data by cloning its objects (offset by PASTE_OFFSET) and
 * selecting the pasted shapes, bumping the commit version.
 */
export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	// data.rootIds is a z-ordered top-level array mixing objects and connectors.
	// cloneObjects returns new IDs in the same order, so we can push them to the front (end of rootIds) as-is.
	const { newObjects, newTopLevelIds } = cloneObjects(
		data.rootIds,
		data.objects,
		PASTE_OFFSET,
		registries.objectBehavior,
	);

	// Re-stamp the features descriptor from this canvas's own registry. The
	// clipboard is untrusted external input, so a carried features must not be
	// trusted; re-stamping also restores the shared reference identity that a
	// JSON round trip breaks (see ObjectState.features).
	for (const [newId, newObj] of Object.entries(newObjects)) {
		newObjects[newId] = {
			...newObj,
			features: registries.objectMapper.getFeatures(newObj.type),
		};
	}

	const mergedObjects = { ...state.objects, ...newObjects };

	// Select only the copied shapes (connectors are managed separately via selectedConnectorId, so exclude them).
	const newObjectIds = newTopLevelIds.filter(
		(id) => mergedObjects[id]?.type !== "connector",
	);

	let nextState: CanvasControllerState = {
		...state,
		objects: mergedObjects,
		rootIds: [...state.rootIds, ...newTopLevelIds],
		selectedIds: newObjectIds,
		// Clear the mutually exclusive connector/vertex selection so the shape selection is non-empty
		// (same as other selectedIds mutation paths; without clearing, SwapArrows / Delete etc.
		// would act on the old connector/vertex that is no longer on screen).
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: createMultiSelectGroup(newObjectIds, mergedObjects, null),
		contextMenuPosition: null,
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	};

	// Re-derive pasted group frames from their children. The clipboard is untrusted
	// external input and isValidGroupState deliberately does not require the frame
	// (it is a cached value), so a crafted/foreign payload can carry a zero-size or
	// missing frame. Deriving via calculateGroupOrientedBounds restores the
	// GroupState invariant (width/height >= MIN_GROUP_DIMENSION) — issue #35.
	// For clipboards produced by CopyCommand this is an idempotent no-op.
	for (const newId of newTopLevelIds) {
		if (nextState.objects[newId]?.type === "group") {
			nextState = updateGroupBoundsFromRoot(nextState, newId);
		}
	}

	return nextState;
};
