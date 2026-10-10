import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { collectObjectPartIds } from "../../../selection/collectObjectPartIds";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import {
	isTextSlotSelection,
	TEXT_SLOT_PART_KIND,
} from "../../../selection/textSlotPartKind";

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
	if (state.selection.objectIds.length !== 1) {
		return null;
	}
	const target = state.objects[state.selection.objectIds[0]];
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
 *   closed, or the input state when the selection does not qualify, or the
 *   object's slot definition lists no slot (a `textSlot` kind a type declares
 *   without `list` cannot be cycled through)
 * @throws When the object spells its text out as slots yet no `textSlot` kind is
 *   registered for its type, which applyObjectDefinition always does
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
	const slotPart = objectPartKind.get(target.type, TEXT_SLOT_PART_KIND);
	if (slotPart === undefined) {
		throw new Error(
			`selectAdjacentTextSlot: no "${TEXT_SLOT_PART_KIND}" part kind is registered for the slotted type "${target.type}"`,
		);
	}
	const slotIds = slotPart.list?.(target) ?? [];
	if (slotIds.length === 0) {
		return state;
	}

	// The object is the sole selection (getTextSlotCycleTarget), so a slot pick
	// is its own.
	const { part } = state.selection;
	const coveredIndices = isTextSlotSelection(part)
		? collectObjectPartIds(part, slotPart, target).map((slotId) =>
				slotIds.indexOf(slotId),
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
				: slotIds.length - 1
			: (currentIndex + step + slotIds.length) % slotIds.length;

	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: slotIds[nextIndex], focusId: slotIds[nextIndex] }],
			},
		},
		objectMenuOpenId: null,
	};
};
