import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";

/**
 * Whether a style write reaches exactly one object, which is what makes the
 * color a menu shows that object's own rather than the first of several.
 *
 * The style menus read through {@link getSelectedShapeStyle}, which answers with
 * the first object it finds, while the write lands on every selected object and,
 * through a selected group, on its descendants — so a menu only knows what the
 * whole target already carries when there is one object in it.
 *
 * @param selectedIds - The ids the menu read its value from, so that the two agree; pass the effective ids (getEffectiveSelectedIds) wherever the menu does
 * @param objects - Every object of the canvas, keyed by id; a selected group is counted with its descendants, an id missing from it as one object
 * @returns true only for a selection of one object that is not a group with members
 */
export const hasSingleStyleTarget = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): boolean =>
	selectedIds.length === 1 &&
	collectDescendantIds(selectedIds[0], objects).length === 0;
