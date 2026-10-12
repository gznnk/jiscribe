import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type {
	ObjectPartKindDefinition,
	ObjectPartKindRegistry,
} from "../partKinds/ObjectPartKindRegistry";
import {
	isTextSlotPart,
	TEXT_SLOT_PART_KIND,
} from "../partKinds/textSlotPartKind";
import { collectObjectPartIds } from "../readers/collectObjectPartIds";

/** What a Tab step walks: the object, its `textSlot` definition and the slot order that definition lists. */
type TextSlotCycle = {
	target: ObjectState & TextStyleState;
	slotPart: ObjectPartKindDefinition;
	slotIds: readonly string[];
};

/**
 * The slots Tab / Shift+Tab walk through: those of the sole selection, when its
 * `textSlot` kind lists more than one — a one-body type has nowhere to step to.
 * Returning the resolution rather than a boolean lets the command's availability
 * check and its execution share it.
 *
 * @param state - The current canvas controller state
 * @param objectPartKind - Per-canvas registry of part kinds, which answers the slot order (`list`)
 * @returns The cycle, or null when the selection does not qualify — including
 *   during any drag, where the selection must not move (same guard as the other
 *   selection commands), and a `textSlot` kind declared without `list`
 * @throws When the selected object holds text yet no `textSlot` kind is
 *   registered for its type, which applyObjectDefinition always does
 */
export const getTextSlotCycle = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): TextSlotCycle | null => {
	if (state.activeDrag !== null) {
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
	const slotPart = objectPartKind.get(target.type, TEXT_SLOT_PART_KIND);
	if (slotPart === undefined) {
		throw new Error(
			`getTextSlotCycle: no "${TEXT_SLOT_PART_KIND}" part kind is registered for "${target.type}", which holds text`,
		);
	}
	const slotIds = slotPart.list?.(target) ?? [];
	return slotIds.length > 1 ? { target, slotPart, slotIds } : null;
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
	const { target, slotPart, slotIds } = cycle;

	// The object is the sole selection (getTextSlotCycle), so a slot pick
	// is its own.
	const { part } = state.selection;
	const coveredIndices = isTextSlotPart(part)
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
