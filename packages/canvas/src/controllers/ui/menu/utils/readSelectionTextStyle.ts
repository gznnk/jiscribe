import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import type { SelectionValue } from "./SelectionValue";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { StyleIntentRegistries } from "../../../style/ObjectStyleRegistry";
import { readSelectionStyle } from "../../../style/readSelectionStyle";

/**
 * What the selection says about each field of its typography. A field left
 * unset by every slot reads as `single` with the value undefined, which is a
 * value of its own: those slots are all drawn the same way, so the row is not
 * mixed and shows its own last resort.
 */
export type SelectionTextStyle = {
	[Key in keyof TextSlotStyle]-?: SelectionValue<
		TextSlotStyle[Key] | undefined
	>;
};

/**
 * What the whole selection says about its text style: every field through its own
 * style intent ({@link readSelectionStyle}), which states the value of every slot a
 * write would reach — the runs a selected stretch of an open editor covers
 * included — resolved through each object type's own text-style defaults, so a
 * shape stating 14px and one whose type defaults to 14px read as one value.
 *
 * @param state - The current canvas controller state; the selection, the objects it names, and any open editor or picked slot are read
 * @param registries - The canvas's style tables and defaults registries
 * @returns Every field of TextSlotStyle; each is `none` when nothing the selection reaches takes that field
 */
export const readSelectionTextStyle = (
	state: CanvasControllerState,
	registries: StyleIntentRegistries,
): SelectionTextStyle => ({
	fontColor: readSelectionStyle(state, "fontColor", registries),
	fontSize: readSelectionStyle(state, "fontSize", registries),
	fontFamily: readSelectionStyle(state, "fontFamily", registries),
	fontWeight: readSelectionStyle(state, "fontWeight", registries),
	fontStyle: readSelectionStyle(state, "fontStyle", registries),
	textDecoration: readSelectionStyle(state, "textDecoration", registries),
	textAlign: readSelectionStyle(state, "textAlign", registries),
	verticalAlign: readSelectionStyle(state, "verticalAlign", registries),
});
