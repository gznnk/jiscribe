import { isString } from "@jiscribe/basic-validators";

import { collectSelectionObjects } from "./collectSelectionObjects";
import type { SelectionValue } from "./SelectionValue";
import { combineSelectionValues } from "./SelectionValue";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";
import { resolveSelectedTextSlotIds } from "../../../selection/resolveSelectedTextSlotIds";
import { resolveAddressedTextSlotIds } from "../../../styleProperties/addressedTextSlots";

/**
 * What the selection says about one field a type loads onto its text slots —
 * the read half of an ExtraStyleProperties declaration carrying a
 * `textSlotField` (a table cell's `fill`).
 *
 * The slots read are the ones a write of that property would land on
 * (resolveSelectedTextSlotIds / resolveAddressedTextSlotIds): those the parts
 * picked one level below the object name, else every slot of every selected
 * object. A menu item therefore states the value of exactly the slots its pick
 * would change, and one whose slots disagree reads `mixed` — the rule a range of
 * characters and a range of slots are already read by (readRichTextRangeStyle /
 * foldSharedTextSlotStyle).
 *
 * @param selectedIds - The selection, in the order the values are folded in; a selected group is walked down into (collectSelectionObjects)
 * @param objects - Every object of the canvas, keyed by id; ids not in it are skipped
 * @param objectPartSelection - The parts picked below the object, already checked
 *   against the selection (resolveObjectPartSelection); one of a kind that covers
 *   no slot names none and so reads every slot, as null does
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, which holds a non-slot
 *   kind's own reading of the slots it covers (a table's row over its cells)
 * @param field - Name of the field on the slot, which is the declaration's
 *   `textSlotField` and not the property name the menu writes under
 * @returns `single` (the value every addressed slot states, `undefined` where
 *   they all leave it unset), `mixed`, or `none` when nothing selected holds
 *   text. A field holding something other than a string reads as `undefined`,
 *   the way a mistyped style field does (getSelectedShapeStyle)
 */
export const readSelectionSlotField = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	objectPartSelection: ObjectPartSelection | null,
	objectPartKind: ObjectPartKindRegistry,
	field: string,
): SelectionValue<string | undefined> => {
	const values: (string | undefined)[] = [];
	for (const object of collectSelectionObjects(selectedIds, objects)) {
		if (!isTextStyleState(object) || object.text === undefined) {
			continue;
		}
		const { text } = object;
		const selectedSlotIds = resolveSelectedTextSlotIds(
			object,
			objectPartSelection,
			objectPartKind,
		);
		for (const slotId of resolveAddressedTextSlotIds(text, selectedSlotIds)) {
			const held = (text[slotId] as Record<string, unknown>)[field];
			values.push(isString(held) ? held : undefined);
		}
	}
	return combineSelectionValues(values);
};
