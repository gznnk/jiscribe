import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * The value of one property, read off the first selected object that has it
 * ({@link getFirstSelectedWithProp}).
 *
 * @param selectedIds - The selection, in the order the first match is taken from; a selected group is searched down into its descendants
 * @param objects - Every object of the canvas, keyed by id; ids not in it are skipped
 * @param prop - The property name, matched by presence (`in`) rather than by the value being set
 * @param isValue - The guard the found value must pass; an object carrying the property with a value of another type yields undefined rather than that value
 * @returns The value, or undefined when nothing selected has the property
 */
export const getFirstSelectedPropValue = <Value>(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	prop: string,
	isValue: (value: unknown) => value is Value,
): Value | undefined => {
	const selected = getFirstSelectedWithProp(selectedIds, objects, prop);
	const value = (selected as Record<string, unknown>)?.[prop];
	return isValue(value) ? value : undefined;
};
