import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Clears a part selection the state no longer backs: its object is not the sole
 * selection, is gone, its kind is not registered for the object's type, or an end
 * of one of its ranges no longer names a part (`has`). Run by every reducer
 * branch that rewrites `selectedIds` or `objects` (the way
 * `reconcileObjectContentSizes` is), so `state.objectPartSelection` is valid
 * whenever it is read and no reader validates it again. Returns `state` itself
 * when nothing has to change, which is what keeps memoized readers from
 * re-rendering.
 *
 * Catches a part that is gone, not one that was renumbered: an operation that
 * renumbers a kind's ids rewrites or clears the selection itself (see
 * ObjectPartSelection).
 *
 * @param state - The state just produced by an action, whose part selection may
 *   name something the same action removed
 * @param objectPartKind - Per-canvas registry of part kinds, asked for the
 *   selection's own `kind` under the selected object's type; a type that declares
 *   no such kind has no parts to select, so the selection is dropped
 * @returns `state` itself (same reference) when the selection still describes
 *   something real, or there is none; otherwise a copy whose
 *   `objectPartSelection` is null — a partly dead selection is dropped whole,
 *   not narrowed to its surviving ranges
 */
export const reconcileObjectPartSelection = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const { objectPartSelection, selectedIds } = state;
	if (objectPartSelection === null) {
		return state;
	}
	if (
		selectedIds.length !== 1 ||
		selectedIds[0] !== objectPartSelection.objectId
	) {
		return { ...state, objectPartSelection: null };
	}

	const target = state.objects[objectPartSelection.objectId];
	if (target === undefined) {
		return { ...state, objectPartSelection: null };
	}
	const part = objectPartKind.get(target.type, objectPartSelection.kind);
	if (part === undefined) {
		return { ...state, objectPartSelection: null };
	}

	const isEveryRangeLive = objectPartSelection.ranges.every(
		(range) =>
			part.has(target, range.anchorId) && part.has(target, range.focusId),
	);
	return isEveryRangeLive ? state : { ...state, objectPartSelection: null };
};
