import type {
	ObjectPartKindDefinition,
	ObjectPartKindRegistry,
} from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { TEXT_SLOT_PART_KIND } from "../partKinds/textSlotPartKind";

/** The sole selection, its `textSlot` definition and the slot order that definition lists. */
export type SelectedTextSlotOrder = {
	target: ObjectState & TextStyleState;
	textSlotPart: ObjectPartKindDefinition;
	textSlotIds: readonly string[];
};

/**
 * The slot order of the sole selection, as its `textSlot` kind lists it. How
 * many slots a caller needs is the caller's (getTextSlotCycle needs two).
 *
 * @param state - The current canvas controller state
 * @param objectPartKind - Per-canvas registry of part kinds, which answers the slot order (`list`)
 * @returns null outside a lone selection holding text, during any drag (where
 *   the selection must not move, as for the other selection commands), and for
 *   a `textSlot` kind that lists no slot or is declared without `list`
 * @throws When the selected object holds text yet no `textSlot` kind is
 *   registered for its type, which applyObjectDefinition always does
 */
export const readSelectedTextSlotOrder = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): SelectedTextSlotOrder | null => {
	if (state.drag !== null) {
		return null;
	}
	if (state.selection.objectIds.length !== 1) {
		return null;
	}
	const target = state.objects[state.selection.objectIds[0]];
	if (
		target === undefined ||
		!isTextStyleState(target) ||
		target.text === undefined
	) {
		return null;
	}
	const textSlotPart = objectPartKind.get(target.type, TEXT_SLOT_PART_KIND);
	if (textSlotPart === undefined) {
		throw new Error(
			`readSelectedTextSlotOrder: no "${TEXT_SLOT_PART_KIND}" part kind is registered for "${target.type}", which holds text`,
		);
	}
	const textSlotIds = textSlotPart.list?.(target) ?? [];
	return textSlotIds.length === 0
		? null
		: { target, textSlotPart, textSlotIds };
};
