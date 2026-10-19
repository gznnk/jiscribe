import { applyTextVerticalBasis } from "@jiscribe/doc/text/block/applyTextVerticalBasis";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import type { ObjectPartKindDefinition } from "../registry/ObjectPartKindRegistry";

/** What placing a slot reads off the state: the box, and the vertical basis the fallback is placed on. */
type TextRegionState = ObjectState &
	Dimensions &
	Pick<TextStyleState, "textVerticalBasis">;

/** The whole box with the object's vertical basis on it: what a slot no registered kind places takes. */
const placeFullTextRegion = (object: TextRegionState): Rect =>
	applyTextVerticalBasis(
		calcFullTextRegion(object),
		object,
		object.textVerticalBasis,
	);

/**
 * Derives the region of one text slot in the shape's local coordinate space
 * (origin at the shape center, before transform). This is the single seam shared
 * by the rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function (or {@link calcTextSlotRegions}, which
 * answers the same rectangles for every slot at once) so the text never jumps
 * when entering or leaving edit mode.
 *
 * The answer is the registered `"textSlot"` part kind's `region`, which already
 * carries the shape's `textVerticalBasis` (placeTextSlotRegions), so every
 * consumer of the region — the overlay, the editor, the slot outline, and image
 * export through the drawn overlay — places the body against the same box.
 *
 * @param object - The object state (carries the untransformed width/height, and the vertical basis the fallback is placed on)
 * @param slotId - Which slot to place; a key of `object.text`. Single-slot shapes hold only `body`
 * @param textSlotKind - The `"textSlot"` part kind registered for the object's type (ObjectPartKindRegistry), basis already applied. Undefined, or a kind answering null (a slot the object does not hold), = the full box with the vertical basis applied
 * @returns The text region (top-left based, local coordinates)
 * @throws Error naming the type and the slot when the kind's `regions` answers no region for `slotId`
 */
export const calcTextRegion = (
	object: TextRegionState,
	slotId: string,
	textSlotKind: ObjectPartKindDefinition | undefined,
): Rect =>
	textSlotKind?.region?.(object, slotId) ?? placeFullTextRegion(object);

/**
 * Derives the region of every text slot of `object.text` in one call, in the
 * same space and with the same answers as {@link calcTextRegion} slot by slot.
 * The registered kind's `regions` is asked once, which is the point: a type
 * declaring a batch calculator lays its slots out once per call rather than once
 * per slot.
 *
 * @param object - The object state; its `text` keys are the slots answered for (absent = no slots, an empty answer)
 * @param textSlotKind - The `"textSlot"` part kind registered for the object's type, basis already applied: its `regions` is called exactly once when declared, otherwise `region` per slot. Undefined = the full box with the vertical basis for every slot
 * @returns One region per key of `object.text`, in its key order
 * @throws Error naming the type and the slot when the kind's `regions` answers no region for a key of `object.text`
 */
export const calcTextSlotRegions = (
	object: TextRegionState & Pick<TextStyleState, "text">,
	textSlotKind: ObjectPartKindDefinition | undefined,
): Readonly<Record<string, Rect>> => {
	if (textSlotKind?.regions !== undefined) {
		return textSlotKind.regions(object);
	}
	const textSlotRegions: Record<string, Rect> = {};
	for (const slotId of Object.keys(object.text ?? {})) {
		textSlotRegions[slotId] = calcTextRegion(object, slotId, textSlotKind);
	}
	return textSlotRegions;
};

/**
 * The region a type placing no slot of its own gets: the whole box, for every
 * slot, before the vertical basis. Exported for the shapes that draw their own
 * overlay and know they have no calculator — going through
 * {@link calcTextRegion} would make them name a slot they have no use for.
 *
 * @param state - The object state; only the untransformed width/height are read
 * @returns The full box in local coordinates, top-left based
 */
export const calcFullTextRegion = (state: Dimensions): Rect => ({
	x: -state.width / 2,
	y: -state.height / 2,
	width: state.width,
	height: state.height,
});
