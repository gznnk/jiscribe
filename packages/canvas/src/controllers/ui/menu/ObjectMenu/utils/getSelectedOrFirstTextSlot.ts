import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import { readRichTextRangeStyle } from "../../../../../schemas/objects/types/RichText";
import type { TextSlot } from "../../../../../schemas/objects/types/TextSlot";
import type { TextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";
import { resolveTextEditSelection } from "../../../../utils/styleTextEditSelection";

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
 * @param state - The current canvas controller state; a stale `selectedTextSlot`
 *   is neutralized here (resolveSelectedTextSlot), so the raw value never reaches
 *   what the menus display
 * @returns The slot, or undefined when nothing selected holds text (the menus then show their defaults)
 */
export const getSelectedOrFirstTextSlot = (
	state: CanvasControllerState,
): TextSlot | undefined => {
	const textEditSelection = resolveTextEditSelection(state);
	if (textEditSelection !== null) {
		const { slot, content, start, end } = textEditSelection;
		return {
			text: "",
			textAlign: slot.textAlign,
			verticalAlign: slot.verticalAlign,
			...readRichTextRangeStyle(content, start, end, slot),
		};
	}

	const selectedTextSlot = resolveSelectedTextSlot(state);
	if (selectedTextSlot !== null) {
		const target = state.objects[selectedTextSlot.objectId];
		if (isTextStyleState(target)) {
			return target.text?.[selectedTextSlot.slotId];
		}
	}

	const text = (
		getFirstSelectedWithProp(state.selectedIds, state.objects, "text") as
			TextStyleState | undefined
	)?.text;
	const slotId = getFirstTextSlotId(text);
	return slotId === undefined ? undefined : text?.[slotId];
};
