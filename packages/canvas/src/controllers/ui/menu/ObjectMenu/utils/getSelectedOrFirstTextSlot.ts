import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import type { ObjectType } from "../../../../../schemas/objects/types/ObjectType";
import { readRichTextRangeStyle } from "../../../../../schemas/objects/types/RichText";
import type { TextSlot } from "../../../../../schemas/objects/types/TextSlot";
import type { ObjectTextStyleDefaultsRegistry } from "../../../../../schemas/registry/ObjectTextStyleDefaultsRegistry";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";
import { resolveTextEditSelection } from "../../../../utils/styleTextEditSelection";

/**
 * One found slot with the defaults its type declares for that slot id resolved
 * in, keeping its content as it is. Undefined passes through, so a caller can
 * hand over whatever its lookup found.
 */
const withTypeStyleDefaults = (
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
	type: ObjectType,
	slotId: string,
	slot: TextSlot | undefined,
): TextSlot | undefined =>
	slot === undefined
		? undefined
		: { ...slot, ...textStyleDefaults.resolveSlotStyle(type, slotId, slot) };

/**
 * The slot the text menus show the current styling of: the slot selected one
 * level below the object when there is one, otherwise the first slot of the
 * first selected object that holds text (descendants of a selected group
 * included). The counterpart to the write side, which targets that same slot and
 * falls back to every slot of every selected object (TextSlotStyleProperty).
 *
 * While an editor is open with a stretch of its text selected, the menus follow
 * that stretch instead: the styling every character of it shares, which is what
 * the write side lands on (TextSlotStyleProperty). A field the stretch is not
 * uniform in reads as unset, so a toggle over a mixed selection turns the format
 * on rather than off. The alignment stays the slot's, having no per-character
 * meaning.
 *
 * Every field is read through the object type's own text-style defaults
 * (ObjectTextStyleDefaultsRegistry), so what a menu shows is what the shape
 * draws even where the author set nothing — and a toggle reads its direction off
 * the same value.
 *
 * @param state - The current canvas controller state; a stale `selectedTextSlot`
 *   is neutralized here (resolveSelectedTextSlot), so the raw value never reaches
 *   what the menus display
 * @param textStyleDefaults - Per-canvas ObjectTextStyleDefaultsRegistry, keyed by
 *   the type of whichever object the slot was found on
 * @returns The slot, or undefined when nothing selected holds text (the menus then show their defaults)
 */
export const getSelectedOrFirstTextSlot = (
	state: CanvasControllerState,
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
): TextSlot | undefined => {
	const textEditSelection = resolveTextEditSelection(state);
	if (textEditSelection !== null) {
		const { type, slotId, slot, content, start, end } = textEditSelection;
		const style = textStyleDefaults.resolveSlotStyle(type, slotId, slot);
		return {
			text: "",
			textAlign: style.textAlign,
			verticalAlign: style.verticalAlign,
			...readRichTextRangeStyle(content, start, end, style),
		};
	}

	const selectedTextSlot = resolveSelectedTextSlot(state);
	if (selectedTextSlot !== null) {
		const target = state.objects[selectedTextSlot.objectId];
		if (isTextStyleState(target)) {
			return withTypeStyleDefaults(
				textStyleDefaults,
				target.type,
				selectedTextSlot.slotId,
				target.text?.[selectedTextSlot.slotId],
			);
		}
	}

	const firstWithText = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"text",
	) as (ObjectState & TextStyleState) | undefined;
	if (firstWithText === undefined) {
		return undefined;
	}
	const slotId = getFirstTextSlotId(firstWithText.text);
	if (slotId === undefined) {
		return undefined;
	}
	return withTypeStyleDefaults(
		textStyleDefaults,
		firstWithText.type,
		slotId,
		firstWithText.text?.[slotId],
	);
};
