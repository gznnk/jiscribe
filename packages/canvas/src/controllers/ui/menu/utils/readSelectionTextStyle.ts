import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import { collectSelectionObjects } from "./collectSelectionObjects";
import { getSelectedOrFirstTextSlot } from "./getSelectedOrFirstTextSlot";
import type { SelectionValue } from "./SelectionValue";
import { combineSelectionValues } from "./SelectionValue";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import { resolveTextEditSelection } from "../../../utils/styleTextEditSelection";

/**
 * What the selection says about each field of its typography. A field left
 * unset by every slot reads as `single` with the value undefined, which is a
 * value of its own: those slots are all drawn the same way, so the row is not
 * mixed and shows its own last resort.
 */
export type SelectionTextStyle = {
	[Key in keyof TextSlotStyle]-?: SelectionValue<
		TextSlotStyle[Key] | undefined
	>;
};

/**
 * The styling of every slot the rows state, one entry per object that holds
 * text. Parts picked below the object, or a stretch of text being edited, narrow
 * the whole thing to that one target — both require a single selection
 * (reconcileSelection / resolveTextEditSelection), so nothing is hidden by
 * following the menus there. A picked part covering no slot (a vertex) leaves
 * the object's own first slot as the answer, which is what the unnarrowed walk
 * would have given a sole selection anyway (getSelectedOrFirstTextSlot).
 */
const collectSelectionTextStyles = (
	state: CanvasControllerState,
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
	objectPartKind: ObjectPartKindRegistry,
): TextSlotStyle[] => {
	if (
		resolveTextEditSelection(state) !== null ||
		state.selection.part !== null
	) {
		const slot = getSelectedOrFirstTextSlot(
			state,
			textStyleDefaults,
			objectPartKind,
		);
		return slot === undefined ? [] : [slot];
	}

	const styles: TextSlotStyle[] = [];
	for (const object of collectSelectionObjects(
		state.selection.objectIds,
		state.objects,
	)) {
		if (!isTextStyleState(object)) {
			continue;
		}
		const slotId = getFirstTextSlotId(object.text);
		if (slotId === undefined) {
			continue;
		}
		styles.push(
			textStyleDefaults.resolveSlotStyle(
				object.type,
				slotId,
				object.text?.[slotId],
			),
		);
	}
	return styles;
};

/** One field folded across the slots the selection reaches. */
const readSlotStyleField = <Key extends keyof TextSlotStyle>(
	styles: readonly TextSlotStyle[],
	key: Key,
): SelectionValue<TextSlotStyle[Key] | undefined> =>
	combineSelectionValues(styles.map((style) => style[key]));

/**
 * What the whole selection says about its text style.
 *
 * Each object contributes its first slot, the one the menus already show and the
 * one the write side lands on, resolved through the object type's own text-style
 * defaults (ObjectTextStyleDefaultsRegistry) — so a shape stating 14px and one
 * whose type defaults to 14px read as one value.
 *
 * @param state - The current canvas controller state; the selection, the objects it names, and any open editor or picked slot are read
 * @param textStyleDefaults - Per-canvas ObjectTextStyleDefaultsRegistry, consulted per object by its own type
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, which decides whether the selection addresses slots inside one object
 * @returns Every field of TextSlotStyle; each is `none` when nothing selected holds text
 */
export const readSelectionTextStyle = (
	state: CanvasControllerState,
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
	objectPartKind: ObjectPartKindRegistry,
): SelectionTextStyle => {
	const styles = collectSelectionTextStyles(
		state,
		textStyleDefaults,
		objectPartKind,
	);
	return {
		fontColor: readSlotStyleField(styles, "fontColor"),
		fontSize: readSlotStyleField(styles, "fontSize"),
		fontFamily: readSlotStyleField(styles, "fontFamily"),
		fontWeight: readSlotStyleField(styles, "fontWeight"),
		fontStyle: readSlotStyleField(styles, "fontStyle"),
		textDecoration: readSlotStyleField(styles, "textDecoration"),
		textAlign: readSlotStyleField(styles, "textAlign"),
		verticalAlign: readSlotStyleField(styles, "verticalAlign"),
	};
};
