import type { Dimensions } from "@jiscribe/geometry";

import { collectCowChangedKeys, copyObjectsRecord } from "./cowObjects";
import { updateAffectedGroupBounds } from "./updateAffectedGroupBounds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextState } from "../../states/objects/primitives/text/TextState";
import type { ObjectContentResizerRegistry } from "../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether an object's height alone is derived, its width being stated: a shape
 * whose document leaves `height` out, and a text wrapping in a width it stores.
 * Both wrap their content at a width they are given, which is what makes the
 * height the only thing a re-measure can move.
 */
const derivesHeightAlone = (object: ObjectState): boolean =>
	object.autoHeight === true ||
	(object as Partial<TextState>).textLayout === "block";

/**
 * Whether an object still holds everything a resizer measures: the very slots it
 * held before — content and typography, the whole of what a box is derived from —
 * at the very width it wrapped them at, and with the same answer to what its box
 * follows at all. Narrower than comparing the object: a move and a vertical-only
 * group resize both write cx/cy and pass all four through untouched.
 *
 * The width belongs here because the two derivations that wrap have one: a block
 * text keeps its stored width and grows downward, and a shape whose document
 * states no height re-wraps at whatever width it is dragged to. The layout mode
 * belongs here for the switch between them: a text going back to a width measured
 * from its own lines changes neither its text nor the width it is drawn at, and
 * the box it must shrink to is exactly what the re-measure is for.
 *
 * A height derived on its own is checked against the one the last measurement
 * left as well, and not only against what that measurement read: every frame of a
 * drag is rebuilt from the gesture's opening snapshot, which puts the opening
 * height back under an unchanged width, and the inputs alone would call that
 * nothing to do and let the drag end on it.
 */
const holdsSameContentInputs = (
	previousObject: ObjectState | undefined,
	object: ObjectState,
): boolean =>
	previousObject !== undefined &&
	previousObject.type === object.type &&
	previousObject.autoHeight === object.autoHeight &&
	(previousObject as Partial<TextState>).textLayout ===
		(object as Partial<TextState>).textLayout &&
	(!derivesHeightAlone(object) ||
		(previousObject as Partial<Dimensions>).height ===
			(object as Partial<Dimensions>).height) &&
	(previousObject as Partial<Dimensions>).width ===
		(object as Partial<Dimensions>).width &&
	(previousObject as TextStyleState).text === (object as TextStyleState).text;

/**
 * Re-measures the box of every object whose box is derived from its content
 * (those with a registered resizer) and whose text, width or box mode changed,
 * so an edit, a font-size change, a widening drag or a paste lands with a box
 * that matches what is drawn. Each box keeps its top-left corner, which is why
 * growing text never shifts what is already on screen.
 *
 * Deliberately ungated: a stale box clips the text it holds, so there is no
 * transition during which one is acceptable — including the uncommitted frames
 * of a font-size drag. What keeps that affordable per frame is
 * {@link collectCowChangedKeys}: while a drag holds the map as a copy-on-write
 * view, every object the transition did not write is the same reference it
 * already was, so only the written IDs are inspected and the pass costs
 * O(moved objects) rather than O(all objects). Maps that share no backing
 * Record fall back to the full scan, where objects holding the slots they
 * already held are skipped by the same reference comparison
 * ({@link holdsSameContentInputs}). A state where nothing needed re-measuring comes
 * back unchanged (same reference), so re-running is free.
 *
 * @param state - The transition's resulting state
 * @param previousState - The state the transition started from, supplying the slots compared against
 * @param contentResizer - The per-canvas content-resizer registry; every type absent from it is skipped outright, so a canvas whose types all store their box does no work here
 * @param forceRemeasure - Re-measures every object even though its slots are untouched. For the one case the slots cannot express: the same family resolving to different faces than it did before (web fonts finishing after the first paint)
 * @returns The same state reference when no box moved; otherwise a state with the re-measured objects swapped in and the ancestor groups' cached frames recomputed
 */
export const reconcileObjectContentSizes = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
	contentResizer: ObjectContentResizerRegistry,
	forceRemeasure = false,
): CanvasControllerState => {
	// A family now resolving to a face that was not loaded yet invalidates every
	// measurement at once, so the narrowed set says nothing about what needs
	// re-measuring and the full scan is the only correct pass.
	const changedIds = forceRemeasure
		? null
		: collectCowChangedKeys(state.objects, previousState.objects);

	let resizedObjects: Record<string, ObjectState> | null = null;
	const resizedIds: string[] = [];

	const reconcileObject = (object: ObjectState): void => {
		const resizeToContent = contentResizer.get(object.type);
		if (!resizeToContent) {
			return;
		}
		if (
			!forceRemeasure &&
			holdsSameContentInputs(previousState.objects[object.id], object)
		) {
			return;
		}
		const resized = resizeToContent(object, {});
		if (resized === object) {
			return;
		}
		if (!resizedObjects) {
			resizedObjects = copyObjectsRecord(state.objects);
		}
		resizedObjects[object.id] = resized;
		resizedIds.push(object.id);
	};

	if (changedIds) {
		for (const id of changedIds) {
			// An ID the previous map added and this one never had resolves to
			// nothing; there is no object to re-measure then.
			const object = state.objects[id];
			if (object) {
				reconcileObject(object);
			}
		}
	} else {
		for (const object of Object.values(state.objects)) {
			reconcileObject(object);
		}
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
