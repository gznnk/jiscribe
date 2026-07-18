import type { Point } from "@workspace/geometry";

import { createCowObjects } from "./cowObjects";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { moveObjectTree } from "../gestures/handlers/objects/primitives/GroupController";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";

export type MoveSelectionParams = {
	/**
	 * The selected IDs to move
	 */
	selectedIds: string[];
	/**
	 * The source object map.
	 * On drag, pass the drag-start snapshot; on command, pass the current state.objects.
	 */
	srcObjects: Record<string, ObjectState>;
	/**
	 * The source multiSelectGroup (the reference for position and properties).
	 * null when there is no multi-selection group.
	 */
	srcMultiSelectGroup: GroupState | null;
	/**
	 * The movement amount. On drag, the snap-corrected cumulative delta; on command, a single delta
	 */
	delta: Point;
	/**
	 * The canvas's object behavior registry (per-shape moveByDelta), threaded down
	 * to moveObjectTree (#165).
	 */
	objectBehavior: ObjectBehaviorRegistry;
};

export type MoveSelectionResult = {
	/** The object map after moving (a COW view of srcObjects — materialize before persisting) */
	objects: Record<string, ObjectState>;
	/** The translated multiSelectGroup (null if src was null) */
	multiSelectGroup: GroupState | null;
};

/**
 * Pure function that translates all selected objects together by delta.
 *
 * Shared movement logic for both drag movement and arrow-key movement (nudge).
 * - Groups move their descendants recursively
 * - Other shapes move via their per-shape moveByDelta (through the Registry)
 * - The multiSelectGroup center (cx/cy) is synchronized as well
 *
 * Updating the parent group's bounding box, snapFeedback, and commitVersion is left to the
 * caller since it differs by context (not touched here).
 */
export function moveSelection(
	params: MoveSelectionParams,
): MoveSelectionResult {
	const {
		selectedIds,
		srcObjects,
		srcMultiSelectGroup,
		delta,
		objectBehavior,
	} = params;

	// COW view: per-frame drag clones must not copy the whole map (#213)
	const objects = createCowObjects(srcObjects);

	// Each selected object is translated through the registry; groups additionally propagate
	// the move to their descendants. (read: srcObjects / write: objects)
	for (const selectedId of selectedIds) {
		moveObjectTree(selectedId, srcObjects, objects, delta, objectBehavior);
	}

	const multiSelectGroup: GroupState | null = srcMultiSelectGroup
		? {
				...srcMultiSelectGroup,
				cx: srcMultiSelectGroup.cx + delta.x,
				cy: srcMultiSelectGroup.cy + delta.y,
			}
		: null;

	return { objects, multiSelectGroup };
}
