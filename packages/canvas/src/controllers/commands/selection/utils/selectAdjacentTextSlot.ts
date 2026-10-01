import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import { resolveObjectPartSelection } from "../../../selection/resolveObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";

/**
 * The object whose slots Tab / Shift+Tab walk through: the sole selection, when
 * it spells its text out as slots. Returning the object rather than a boolean
 * lets the command's availability check and its execution share one resolution.
 *
 * @param state - The current canvas controller state
 * @returns The selected object, narrowed to one carrying `text`, or null when
 *   the selection does not qualify — including during any drag, where the
 *   selection must not move (same guard as the other selection commands)
 */
export const getTextSlotCycleTarget = (
	state: CanvasControllerState,
): (ObjectState & TextStyleState) | null => {
	if (state.activeDrag !== null) {
		return null;
	}
	if (state.selectedIds.length !== 1) {
		return null;
	}
	const target = state.objects[state.selectedIds[0]];
	if (target === undefined || target.features?.text !== "slots") {
		return null;
	}
	if (!isTextStyleState(target) || target.text === undefined) {
		return null;
	}
	return target;
};

/**
 * Moves the slot selection one step along the object's own slot order (the
 * `textSlot` part definition's `list`), wrapping around at either end.
 *
 * A step always lands on exactly one slot: a range selected with a modifier
 * collapses, leaving the slot next to the end the step travels towards — the
 * last of the range going forwards, the first of it going back.
 *
 * @param state - The current canvas controller state; a stale `objectPartSelection`
 *   counts as no slot selected (resolveObjectPartSelection)
 * @param step - 1 for the next slot, -1 for the previous; with no slot selected
 *   yet these enter at the first and the last slot respectively
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, which answers both the slot
 *   order and whether the live selection still names slots of this object
 * @returns A new state with `objectPartSelection` moved and any open ObjectMenu submenu
 *   closed, or the input state when the selection does not qualify or the object
 *   declares no slot at all
 */
export const selectAdjacentTextSlot = (
	state: CanvasControllerState,
	step: 1 | -1,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const target = getTextSlotCycleTarget(state);
	if (target === null) {
		return state;
	}
	const part = objectPartKind.get(target.type, TEXT_SLOT_PART_KIND);
	const slotIds = part?.list?.(target) ?? [];
	if (slotIds.length === 0) {
		return state;
	}

	const currentSlot = resolveObjectPartSelection(state, objectPartKind);
	const currentPartIds =
		currentSlot?.kind === TEXT_SLOT_PART_KIND ? currentSlot.partIds : undefined;
	const currentSlotId =
		currentPartIds === undefined
			? undefined
			: step === 1
				? currentPartIds[currentPartIds.length - 1]
				: currentPartIds[0];
	const currentIndex =
		currentSlotId === undefined ? -1 : slotIds.indexOf(currentSlotId);
	const nextIndex =
		currentIndex === -1
			? step === 1
				? 0
				: slotIds.length - 1
			: (currentIndex + step + slotIds.length) % slotIds.length;

	return {
		...state,
		objectPartSelection: {
			objectId: target.id,
			kind: TEXT_SLOT_PART_KIND,
			partIds: [slotIds[nextIndex]],
		},
		objectMenuOpenId: null,
	};
};
