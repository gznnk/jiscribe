import { updateAffectedGroupBounds } from "./updateAffectedGroupBounds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { resizeTextStateToContent } from "../../states/objects/primitives/text/resizeTextStateToContent";
import {
	isTextState,
	type TextState,
} from "../../states/objects/primitives/text/TextState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether an object still holds the very slots it held before. The slots carry
 * the content and the typography, which are the whole of what the measurement
 * reads, so this is the exact test for "nothing that decides the box moved" —
 * and it is narrower than comparing the object: a move or a group resize writes
 * cx/cy and passes the slots through untouched.
 */
const holdsSameText = (
	previousObject: ObjectState | undefined,
	object: TextState,
): boolean =>
	isTextState(previousObject) && previousObject.text === object.text;

/**
 * Re-measures the box of every text object whose text changed, so an edit, a
 * font-size change or a paste lands with a box that matches what is drawn. Each
 * box keeps its top-left corner (see resizeTextStateToContent), which is why
 * growing text never shifts what is already on screen.
 *
 * Deliberately ungated: a stale box clips the text it holds, so there is no
 * transition during which one is acceptable — including the uncommitted frames
 * of a font-size drag. Running it every frame costs a type check and a reference
 * comparison per object, because objects holding the slots they already held are
 * skipped ({@link holdsSameText}) — unless the theme's family changed, which
 * invalidates every measurement at once regardless of what the transition
 * touched. A state where nothing needed re-measuring comes back unchanged (same
 * reference), so re-running is free.
 *
 * @param state - The transition's resulting state; its `docDefaults.fontFamily` is the family measured with
 * @param previousState - The state the transition started from, supplying both the slots compared against and the previous theme family
 * @returns The same state reference when no box moved; otherwise a state with the re-measured objects swapped in and the ancestor groups' cached frames recomputed
 */
export const reconcileTextObjectSizes = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
): CanvasControllerState => {
	const fontFamily = state.docDefaults.fontFamily;
	const isThemeFontUnchanged =
		fontFamily === previousState.docDefaults.fontFamily;
	let resizedObjects: Record<string, ObjectState> | null = null;
	const resizedIds: string[] = [];

	for (const object of Object.values(state.objects)) {
		if (!isTextState(object)) {
			continue;
		}
		if (
			isThemeFontUnchanged &&
			holdsSameText(previousState.objects[object.id], object)
		) {
			continue;
		}
		const resized = resizeTextStateToContent(object, fontFamily);
		if (resized === object) {
			continue;
		}
		if (!resizedObjects) {
			resizedObjects = { ...state.objects };
		}
		resizedObjects[object.id] = resized;
		resizedIds.push(object.id);
	}

	if (!resizedObjects) {
		return state;
	}
	// A group's frame is cached, not derived on read, so a box that grew inside one
	// leaves the ancestor outlines behind until they are recomputed here.
	return updateAffectedGroupBounds(
		{ ...state, objects: resizedObjects },
		resizedIds,
	);
};
