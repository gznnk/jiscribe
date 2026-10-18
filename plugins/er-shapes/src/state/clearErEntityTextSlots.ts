import { richTextToPlain } from "@jiscribe/doc";
import type { RichText, TextSlot } from "@jiscribe/doc";

import type { ErEntityState } from "./ErEntityState";
import { reconcileErEntityBox } from "./reconcileErEntityBox";

/**
 * Empties the named text slots of an entity — what Delete means over picked
 * slots, as against over a column grip, where the column itself goes. Only the
 * text is taken: a slot's typography is formatting and stays, as a table cell's
 * does (clearTableCells). The box is reconciled afterwards
 * (reconcileErEntityBox): the name and type columns keep their px however long
 * the cleared text was, and an automatic key gutter follows its keys, as it does
 * when one is edited empty.
 *
 * Registered as the `delete` of the entity's `"textSlot"` part.
 *
 * @param state - The entity to clear in; left untouched
 * @param slotIds - The slots to empty, as `state.text` keys them; ids the entity has no slot at are ignored
 * @returns A new state with those slots empty, or null when every one of them was empty already — the refusal that leaves the selection standing
 */
export const clearErEntityTextSlots = (
	state: ErEntityState,
	slotIds: readonly string[],
): ErEntityState | null => {
	const text: Record<string, TextSlot<RichText>> = { ...state.text };
	let isCleared = false;
	for (const slotId of slotIds) {
		const slot = text[slotId];
		if (slot === undefined || richTextToPlain(slot.text) === "") {
			continue;
		}
		text[slotId] = { ...slot, text: "" };
		isCleared = true;
	}
	return isCleared ? reconcileErEntityBox({ ...state, text }) : null;
};
