import type { ObjectPartRegistry } from "./ObjectPartRegistry";
import type { ObjectPartSelection } from "./ObjectPartSelection";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Validates `state.objectPartSelection` against the current selection and objects, so a
 * part selection is visible to readers only while it still describes something real.
 * Checking on read rather than clearing on write follows commitTextEditIfNeeded /
 * graftTextEditDraft: selectedIds and the object map are rewritten from dozens of
 * places, none of which then has to know about parts.
 *
 * Both the namespace and every id in it are the object type's to judge: an
 * unregistered `kind` resolves to nothing (so a selection meant for another kind
 * is dropped rather than read by slot rules), and each id is put to the
 * definition's `has`. Ids that no longer name a part are dropped one by one —
 * a range whose middle part was removed keeps the rest — and only a selection
 * left with nothing resolves to null.
 *
 * @param state - The current canvas controller state
 * @param objectPart - Per-canvas ObjectPartRegistry; the definition registered
 *   for `(object type, kind)` decides which ids still exist
 * @returns `state.objectPartSelection` itself (same reference, so memoized readers keep
 *   bailing out) when its object is the sole selection, registers the kind and still
 *   holds every id; a narrowed copy when some ids are gone; null when the selection
 *   does not qualify at all or nothing is left of it
 */
export const resolveObjectPartSelection = (
	state: CanvasControllerState,
	objectPart: ObjectPartRegistry,
): ObjectPartSelection | null => {
	const { objectPartSelection, selectedIds } = state;
	if (objectPartSelection === null) {
		return null;
	}
	if (
		selectedIds.length !== 1 ||
		selectedIds[0] !== objectPartSelection.objectId
	) {
		return null;
	}

	const target = state.objects[objectPartSelection.objectId];
	if (target === undefined) {
		return null;
	}
	const part = objectPart.get(target.type, objectPartSelection.kind);
	if (part === undefined) {
		return null;
	}

	const livePartIds = objectPartSelection.partIds.filter((partId) =>
		part.has(target, partId),
	);
	if (livePartIds.length === 0) {
		return null;
	}
	if (livePartIds.length === objectPartSelection.partIds.length) {
		return objectPartSelection;
	}
	const { anchorPartId } = objectPartSelection;
	return {
		...objectPartSelection,
		partIds: livePartIds,
		// An anchor that went with the dropped parts stops being one; the first
		// surviving part stands in for it (the reading of an absent anchor).
		anchorPartId:
			anchorPartId !== undefined && livePartIds.includes(anchorPartId)
				? anchorPartId
				: undefined,
	};
};
