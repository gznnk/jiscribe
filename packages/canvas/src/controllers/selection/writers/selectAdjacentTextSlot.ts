import type { ObjectPartKindRegistry } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	isTextSlotPart,
	TEXT_SLOT_PART_KIND,
} from "../partKinds/textSlotPartKind";
import { collectObjectPartIds } from "../readers/collectObjectPartIds";
import { readSelectedTextSlotOrder } from "../readers/readSelectedTextSlotOrder";
import type { SelectedTextSlotOrder } from "../readers/readSelectedTextSlotOrder";

/**
 * The slots Tab / Shift+Tab walk through: the sole selection's slot order
 * (readSelectedTextSlotOrder), when it holds more than one — a one-body type
 * has nowhere to step to. Returning the resolution rather than a boolean lets
 * the command's availability check and its execution share it.
 *
 * @param state - The current canvas controller state
 * @param objectPartKind - Per-canvas registry of part kinds, which answers the slot order (`list`)
 * @returns The slot order, or null when the selection does not qualify (see readSelectedTextSlotOrder)
 * @throws As readSelectedTextSlotOrder does
 */
export const getTextSlotCycle = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): SelectedTextSlotOrder | null => {
	const slotOrder = readSelectedTextSlotOrder(state, objectPartKind);
	return slotOrder !== null && slotOrder.textSlotIds.length > 1
		? slotOrder
		: null;
};

/**
 * Moves the slot selection one step along the object's own slot order (the
 * `textSlot` part definition's `list`), wrapping around at either end.
 *
 * A step always lands on exactly one slot: a picked range collapses, leaving
 * the slot next to the end the step travels towards — the last of what is
 * covered going forwards, the first of it going back, both in `list` order.
 *
 * @param state - The current canvas controller state; its `selection.part`
 *   names the slot the step starts from, and is live rather than stale because the
 *   reducer reconciles it (reconcileSelection)
 * @param step - 1 for the next slot, -1 for the previous; with no slot selected
 *   yet these enter at the first and the last slot respectively
 * @param objectPartKind - Per-canvas registry of part kinds, which answers both
 *   the slot order and what the picked ranges cover
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu
 *   closed, or the input state when the selection does not qualify
 *   (getTextSlotCycle)
 * @throws As getTextSlotCycle does
 */
export const selectAdjacentTextSlot = (
	state: CanvasControllerState,
	step: 1 | -1,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const cycle = getTextSlotCycle(state, objectPartKind);
	if (cycle === null) {
		return state;
	}
	const { target, textSlotPart, textSlotIds } = cycle;

	// The object is the sole selection (getTextSlotCycle), so a slot pick
	// is its own.
	const { part } = state.selection;
	const coveredIndices = isTextSlotPart(part)
		? collectObjectPartIds(part, textSlotPart, target).map((slotId) =>
				textSlotIds.indexOf(slotId),
			)
		: [];
	const currentIndex =
		coveredIndices.length === 0
			? -1
			: step === 1
				? Math.max(...coveredIndices)
				: Math.min(...coveredIndices);
	const nextIndex =
		currentIndex === -1
			? step === 1
				? 0
				: textSlotIds.length - 1
			: (currentIndex + step + textSlotIds.length) % textSlotIds.length;

	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [
					{ anchorId: textSlotIds[nextIndex], focusId: textSlotIds[nextIndex] },
				],
			},
		},
		objectMenuOpenId: null,
	};
};
