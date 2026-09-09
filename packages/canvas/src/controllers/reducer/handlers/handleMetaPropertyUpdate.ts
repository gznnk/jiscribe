import type { MetaState } from "../../../states/objects/base/MetaState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { rebrand } from "../../../states/objects/utils/rebrand";
import type { CanvasControllerState } from "../../CanvasTypes";
import { copyObjectsRecord } from "../../utils/cowObjects";
import { resolveMetaTargetId } from "../../utils/resolveMetaTargetId";
import type { MetaProperty } from "../CanvasActions";

/** An emptied field is no note at all, so both spellings of empty drop the key. */
const normalizeMetaValue = (value: string | null): string | undefined =>
	value === null || value === "" ? undefined : value;

/**
 * The object's `meta` with one field stated, or undefined once the last field is
 * gone — an object that carries no note carries no `meta` either, which is the
 * shape the parser produces for a document without one.
 */
const buildUpdatedMeta = (
	srcMeta: MetaState | undefined,
	property: MetaProperty,
	value: string | undefined,
): MetaState | undefined => {
	const updatedEntries: Record<string, unknown> = { ...srcMeta };
	if (value === undefined) {
		delete updatedEntries[property];
	} else {
		updatedEntries[property] = value;
	}
	if (Object.keys(updatedEntries).length === 0) {
		return undefined;
	}
	return rebrand<MetaState>(updatedEntries);
};

/**
 * Whether a meta edit has an object to land on at all. Says nothing about
 * whether that object already holds the value — which is what the reducer needs
 * to tell apart: a commit of the value the object holds is the normal end of a
 * typed edit (the preview applied it already) and is recorded, while an edit
 * with no target is a no-op whether previewed or committed.
 *
 * @param state - The state whose selection names the object; `selectedConnectorId` first, then a lone `selectedIds` entry
 */
export const canApplyMetaProperty = (state: CanvasControllerState): boolean =>
	resolveMetaTargetId(state) !== null;

/**
 * States one field of the selected object's `meta`, the note it carries in the
 * document.
 *
 * Nothing is drawn from `meta`, so the object's shape is untouched and no
 * descendant follows: a selected group takes the note itself.
 *
 * @param state - The state to edit; its selection names the one object written to, and nothing else is read
 * @param property - Which of the two meta fields is being stated
 * @param value - The text to state, or null to drop the field; an empty string drops it too
 * @returns `state` itself when the selection names no single object (nothing, or several), and when the field already holds the value
 */
export const handleMetaPropertyUpdate = (
	state: CanvasControllerState,
	property: MetaProperty,
	value: string | null,
): CanvasControllerState => {
	const targetId = resolveMetaTargetId(state);
	if (targetId === null) {
		return state;
	}
	const srcObject = state.objects[targetId];
	if (!srcObject) {
		return state;
	}

	const statedValue = normalizeMetaValue(value);
	if (srcObject.meta?.[property] === statedValue) {
		return state;
	}

	const updatedObject: ObjectState = {
		...srcObject,
		meta: buildUpdatedMeta(srcObject.meta, property, statedValue),
	};
	// A plain Record rather than a write into the map handed in: persistent state
	// must not accumulate copy-on-write views (cowObjects), and this route builds
	// none of its own to flatten afterwards.
	const updatedObjects = copyObjectsRecord(state.objects);
	updatedObjects[targetId] = updatedObject;
	return { ...state, objects: updatedObjects };
};
