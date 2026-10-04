import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { readRichTextRangeStyle } from "@jiscribe/doc/model/objects/types/text/RichText";
import type {
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import { resolveSelectedTextSlotIds } from "../../../selection/resolveSelectedTextSlotIds";
import { resolveTextEditSelection } from "../../../utils/styleTextEditSelection";

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
 * The styling several selected slots agree on, as one slot standing for them
 * all. A field they disagree on is left unset, which reads back as "mixed" and
 * makes a toggle over them turn the format on rather than off — the rule
 * readRichTextRangeStyle already applies to a range of characters. The content
 * is empty: a range of slots has no one text to show.
 *
 * @param slots - Two or more slots, each with its type's defaults already resolved in
 * @returns A slot carrying only the fields every one of them states alike
 */
const foldSharedTextSlotStyle = (slots: readonly TextSlot[]): TextSlot => {
	const shared: TextSlotStyle = {};
	for (const key of TEXT_SLOT_STYLE_KEYS) {
		const first = slots[0][key];
		if (first !== undefined && slots.every((slot) => slot[key] === first)) {
			// The key is narrowed per iteration, which the index signature cannot
			// express; every branch writes the very field it read.
			(shared as Record<string, unknown>)[key] = first;
		}
	}
	return { text: "", ...shared };
};

/**
 * The one slot a text style is read from: the slot the parts picked one level
 * below the object name (resolveSelectedTextSlotIds, so a table's row is read as
 * the cells of that row) — or, for several of them, what they all agree on
 * (foldSharedTextSlotStyle) — otherwise the first slot of the first selected
 * object that holds text (descendants of a selected group included). The
 * counterpart to the write side, which targets those same slots and falls back
 * to every slot of every selected object (TextSlotStyleProperty). The menus read
 * through readSelectionTextStyle, which hands the picked-slot and editing cases
 * here and folds every object's first slot itself otherwise.
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
 * @param state - The current canvas controller state; its `selection.part` is
 *   read as it stands, the reducer having already dropped a stale one
 *   (reconcileSelection)
 * @param textStyleDefaults - Per-canvas ObjectTextStyleDefaultsRegistry, keyed by
 *   the type of whichever object the slot was found on
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, which decides whether the
 *   selection still names slots inside one object
 * @returns The slot, or undefined when nothing selected holds text (the menus then show their defaults)
 */
export const getSelectedOrFirstTextSlot = (
	state: CanvasControllerState,
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
	objectPartKind: ObjectPartKindRegistry,
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

	const { objectIds, part } = state.selection;
	if (part !== null) {
		const target = state.objects[objectIds[0]];
		if (isTextStyleState(target)) {
			const selectedSlotIds =
				resolveSelectedTextSlotIds(target, state.selection, objectPartKind) ??
				[];
			const selectedSlots = selectedSlotIds
				.map((slotId) =>
					withTypeStyleDefaults(
						textStyleDefaults,
						target.type,
						slotId,
						target.text?.[slotId],
					),
				)
				.filter((slot): slot is TextSlot => slot !== undefined);
			// One slot is handed back as it stands, content and any fields its type
			// adds to a slot included; only a range has to be folded down to what its
			// members agree on.
			if (selectedSlots.length === 1) {
				return selectedSlots[0];
			}
			if (selectedSlots.length > 1) {
				return foldSharedTextSlotStyle(selectedSlots);
			}
		}
	}

	const firstWithText = getFirstSelectedWithProp(
		objectIds,
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
