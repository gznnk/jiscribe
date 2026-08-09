import { updateAffectedGroupBounds } from "./updateAffectedGroupBounds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { ObjectContentResizerRegistry } from "../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether an object still holds the very slots it held before. The slots carry
 * the content and the typography, which are the whole of what a resizer reads,
 * so this is the exact test for "nothing that decides the box moved" — and it is
 * narrower than comparing the object: a move or a group resize writes cx/cy and
 * passes the slots through untouched.
 */
const holdsSameTextSlots = (
	previousObject: ObjectState | undefined,
	object: ObjectState,
): boolean =>
	previousObject !== undefined &&
	previousObject.type === object.type &&
	(previousObject as TextStyleState).text === (object as TextStyleState).text;

/**
 * Re-measures the box of every object whose box is derived from its content
 * (those with a registered resizer) and whose text changed, so an edit, a
 * font-size change or a paste lands with a box that matches what is drawn. Each
 * box keeps its top-left corner, which is why growing text never shifts what is
 * already on screen.
 *
 * Deliberately ungated: a stale box clips the text it holds, so there is no
 * transition during which one is acceptable — including the uncommitted frames
 * of a font-size drag. Running it every frame costs a registry lookup and a
 * reference comparison per object, because objects holding the slots they
 * already held are skipped ({@link holdsSameTextSlots}) — unless the theme's family
 * changed, which invalidates every measurement at once regardless of what the
 * transition touched. A state where nothing needed re-measuring comes back
 * unchanged (same reference), so re-running is free.
 *
 * @param state - The transition's resulting state; its `docDefaults.fontFamily` is the family measured with
 * @param previousState - The state the transition started from, supplying both the slots compared against and the previous theme family
 * @param contentResizer - The per-canvas content-resizer registry; every type absent from it is skipped outright, so a canvas whose types all store their box does no work here
 * @returns The same state reference when no box moved; otherwise a state with the re-measured objects swapped in and the ancestor groups' cached frames recomputed
 */
export const reconcileObjectContentSizes = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
	contentResizer: ObjectContentResizerRegistry,
): CanvasControllerState => {
	const fontFamily = state.docDefaults.fontFamily;
	const isThemeFontUnchanged =
		fontFamily === previousState.docDefaults.fontFamily;
	let resizedObjects: Record<string, ObjectState> | null = null;
	const resizedIds: string[] = [];

	for (const object of Object.values(state.objects)) {
		const resizeToContent = contentResizer.get(object.type);
		if (!resizeToContent) {
			continue;
		}
		if (
			isThemeFontUnchanged &&
			holdsSameTextSlots(previousState.objects[object.id], object)
		) {
			continue;
		}
		const resized = resizeToContent(object, { fontFamily });
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
