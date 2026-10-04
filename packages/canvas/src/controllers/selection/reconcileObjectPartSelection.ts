import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Clears a part selection the state no longer backs: its object is not the sole
 * selection, is gone, its kind is not registered for the object's type, or an end
 * of one of its ranges no longer names a part (`has`). Run by every reducer
 * branch that rewrites `selection` or `objects` (the way
 * `reconcileObjectContentSizes` is), so `state.selection.part` is valid whenever
 * it is read and no reader validates it again. Returns `state` itself when
 * nothing has to change, which is what keeps memoized readers from re-rendering.
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
 *   something real, or there is none; otherwise a copy whose `selection.part` is
 *   null — a partly dead selection is dropped whole, not narrowed to its
 *   surviving ranges
 */
export const reconcileObjectPartSelection = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const { objectIds, part: partSelection } = state.selection;
	if (partSelection === null) {
		return state;
	}
	const dropPart = (): CanvasControllerState => ({
		...state,
		selection: { ...state.selection, part: null },
	});
	if (objectIds.length !== 1) {
		return dropPart();
	}

	const target = state.objects[objectIds[0]];
	if (target === undefined) {
		return dropPart();
	}
	const part = objectPartKind.get(target.type, partSelection.kind);
	if (part === undefined) {
		return dropPart();
	}

	const isEveryRangeLive = partSelection.ranges.every(
		(range) =>
			part.has(target, range.anchorId) && part.has(target, range.focusId),
	);
	return isEveryRangeLive ? state : dropPart();
};
