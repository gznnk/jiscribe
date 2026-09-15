import { collectSelectionObjects } from "./collectSelectionObjects";
import type { SelectionValue } from "./SelectionValue";
import { combineSelectionValues } from "./SelectionValue";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * What the whole selection says about one property: the value read off every
 * object that carries it, folded into one answer.
 *
 * Which objects carry the property, and what an object that carries it but sets
 * nothing resolves to, are both `readObjectValue`'s to decide — it is the only
 * place that knows whether a type declares the field and which registry
 * resolves it. Returning `undefined` from it means "this object has no say", not
 * "this object has it unset": where unset is a state of its own, map it to a
 * sentinel (`"solid"` for a dash nobody declared) so two objects can disagree
 * about it.
 *
 * @param selectedIds - The selection; a selected group contributes its descendants too (collectSelectionObjects)
 * @param objects - Every object of the canvas, keyed by id
 * @param readObjectValue - Reads one object's value, or undefined for an object the property does not apply to
 * @returns `single` / `mixed` / `none`; `none` when no object of the selection carries the property
 */
export const readSelectionValue = <Value>(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	readObjectValue: (object: ObjectState) => Value | undefined,
): SelectionValue<Value> => {
	const values: Value[] = [];
	for (const object of collectSelectionObjects(selectedIds, objects)) {
		const value = readObjectValue(object);
		if (value !== undefined) {
			values.push(value);
		}
	}
	return combineSelectionValues(values);
};
