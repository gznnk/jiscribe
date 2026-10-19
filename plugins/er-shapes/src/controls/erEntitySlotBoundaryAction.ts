import type { Mods } from "@jiscribe/canvas";

/** The boundary between the key gutter and the name, the strip's `data-action` index 0. */
export const ER_ENTITY_KEY_NAME_BOUNDARY = 0;

/** The boundary between the name and the type column, the strip's `data-action` index 1. */
export const ER_ENTITY_NAME_TYPE_BOUNDARY = 1;

/** One of the two slot boundaries a row has. */
export type ErEntitySlotBoundaryIndex =
	typeof ER_ENTITY_KEY_NAME_BOUNDARY | typeof ER_ENTITY_NAME_TYPE_BOUNDARY;

/**
 * The slot boundary a strip's `data-action` names, or null when it names none.
 * One control draws both strips, each appending its index
 * (`selection:erEntity:slotBoundary:1`), which comes back as
 * `SelectionControlEvent.subAction`.
 *
 * @param subAction - The `data-action` segment after `selection:erEntity:slotBoundary:`, or undefined when the handle carries none; only `"0"` and `"1"` written plainly are read
 * @returns {@link ER_ENTITY_KEY_NAME_BOUNDARY} or {@link ER_ENTITY_NAME_TYPE_BOUNDARY}
 */
export const parseErEntitySlotBoundaryIndex = (
	subAction: string | undefined,
): ErEntitySlotBoundaryIndex | null => {
	if (subAction === "0") {
		return ER_ENTITY_KEY_NAME_BOUNDARY;
	}
	if (subAction === "1") {
		return ER_ENTITY_NAME_TYPE_BOUNDARY;
	}
	return null;
};

/**
 * How a slot boundary drag shares out its distance. `"leading"` resizes the slot
 * before the boundary (the key gutter, or the name) and lets the box grow or
 * shrink with it; `"pair"` trades between the two slots either side and keeps
 * the box's width.
 */
export type ErEntitySlotBoundaryDragMode = "leading" | "pair";

/**
 * The mode a slot boundary drag runs in this frame: Shift held trades between
 * the pair, anything else resizes the leading slot alone.
 *
 * @param mods - The modifiers of the current drag frame, not of gesture start, so pressing or releasing Shift mid-drag switches mode on the next frame
 */
export const readErEntitySlotBoundaryDragMode = (
	mods: Mods,
): ErEntitySlotBoundaryDragMode => (mods.shift ? "pair" : "leading");
