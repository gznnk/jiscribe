import type { Point } from "@jiscribe/geometry";

import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import {
	computeDuplicateOffset,
	DUPLICATE_OFFSET,
	isLastDuplicateStillSelected,
} from "../../commands/selection/utils/computeDuplicateOffset";
import { getSelectionCenter } from "../../commands/selection/utils/getSelectionCenter";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { calcObjectsBoundingBox } from "../../utils/calcObjectBoundingBox";
import { calcVisibleWorldRect } from "../../utils/calcVisibleWorldRect";
import { cloneObjects } from "../../utils/cloneObjects";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { updateGroupBoundsFromRoots } from "../../utils/updateGroupBoundsFromRoot";

/**
 * Decides where the clipboard set lands and which step the next paste should chain by.
 *
 * The center is taken from the clipboard's own objects rather than from the stored
 * `data.center`, which is untrusted input and need not match them.
 *
 * @returns `offset` is added to every cloned object's position; `step` is what gets
 *   recorded in lastDuplicate, which is the walk of a repeated paste rather than the
 *   possibly large jump a re-centering produced
 */
const computePastePlacement = (
	state: CanvasControllerState,
	data: ClipboardData,
): { offset: Point; step: Point } => {
	const topLevelObjectIds = data.rootIds.filter(
		(id) => data.objects[id]?.type !== "connector",
	);
	const clipboardBounds = calcObjectsBoundingBox(
		topLevelObjectIds,
		data.objects,
	);
	// Connector-only clipboard: nothing to place relative to the view.
	if (!clipboardBounds) {
		return { offset: DUPLICATE_OFFSET, step: DUPLICATE_OFFSET };
	}

	const clipboardCenter = {
		x: (clipboardBounds.left + clipboardBounds.right) / 2,
		y: (clipboardBounds.top + clipboardBounds.bottom) / 2,
	};

	// A repeated paste walks on from the copy it just made, so the source of the
	// walk is the selection, not the clipboard that never moves.
	const step = computeDuplicateOffset(state);
	const chainedCenter = isLastDuplicateStillSelected(state)
		? getSelectionCenter(state, state.selectedIds)
		: null;
	const offset: Point = chainedCenter
		? {
				x: chainedCenter.cx + step.x - clipboardCenter.x,
				y: chainedCenter.cy + step.y - clipboardCenter.y,
			}
		: step;

	const visibleRect = calcVisibleWorldRect(state.viewport);
	// An unmeasured container gives an empty rect; there is no view to fall back to yet.
	if (visibleRect.width <= 0 || visibleRect.height <= 0) {
		return { offset, step };
	}

	const center = {
		x: clipboardCenter.x + offset.x,
		y: clipboardCenter.y + offset.y,
	};
	const isCenterVisible =
		center.x >= visibleRect.x &&
		center.x <= visibleRect.x + visibleRect.width &&
		center.y >= visibleRect.y &&
		center.y <= visibleRect.y + visibleRect.height;
	if (isCenterVisible) {
		return { offset, step };
	}

	return {
		offset: {
			x: visibleRect.x + visibleRect.width / 2 - clipboardCenter.x,
			y: visibleRect.y + visibleRect.height / 2 - clipboardCenter.y,
		},
		// The walk restarts from the re-centered copy; carrying the jump over would
		// throw the next paste back out of the view.
		step: DUPLICATE_OFFSET,
	};
};

/**
 * Pastes clipboard data by cloning its objects and selecting the pasted shapes,
 * bumping the commit version.
 *
 * Placement: the clipboard's own position plus DUPLICATE_OFFSET, or the middle of the
 * view when that would put the set's center off screen. A paste whose result is still
 * selected chains off it instead, so repeated pastes walk rather than stack.
 */
export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const { offset, step } = computePastePlacement(state, data);

	// data.rootIds is a z-ordered top-level array mixing objects and connectors.
	// cloneObjects returns new IDs in the same order, so we can push them to the front (end of rootIds) as-is.
	const { newObjects, newTopLevelIds } = cloneObjects(
		data.rootIds,
		data.objects,
		offset,
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

	const nextState: CanvasControllerState = {
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
		commitVersion: state.commitVersion + 1,
	};

	// Re-derive pasted group frames from their children. The clipboard is untrusted
	// external input and isValidGroupState deliberately does not require the frame
	// (it is a cached value), so a crafted/foreign payload can carry a zero-size or
	// missing frame. Deriving via calculateGroupOrientedBounds restores the
	// GroupState invariant (width/height >= MIN_GROUP_DIMENSION) — issue #35.
	// For clipboards produced by CopyCommand this is an idempotent no-op.
	const pastedGroupIds = newTopLevelIds.filter(
		(newId) => nextState.objects[newId]?.type === "group",
	);
	const pastedState = updateGroupBoundsFromRoots(nextState, pastedGroupIds);

	// Record the paste the same way DuplicateCommand records a duplicate, so the next
	// Ctrl+V (or Ctrl+D) chains off it.
	const pastedCenter = getSelectionCenter(pastedState, newObjectIds);

	return {
		...pastedState,
		lastDuplicate: pastedCenter
			? {
					newIds: newObjectIds,
					cx: pastedCenter.cx,
					cy: pastedCenter.cy,
					offset: step,
				}
			: null,
	};
};
