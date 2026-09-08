import { isString } from "@jiscribe/basic-validators";
import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";

import { readSelectionValue } from "./readSelectionValue";
import type { SelectionValue } from "./SelectionValue";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../utils/getEffectiveSelectedIds";

/** The mark an end nobody set carries: the doc omits the key for a bare end. */
const UNSET_ARROW_TYPE: ArrowType = "None";

/**
 * What the whole selection says about one end of its arrows.
 *
 * Who has a say is decided by `features.arrow` rather than by the key being
 * present, the way the style rows go by their style group: a doc that set
 * neither end yields a state without the key, and such a line still draws a bare
 * end — one that disagrees with a line carrying a mark.
 *
 * @param state - The current canvas controller state; a selected connector answers for itself (getEffectiveSelectedIds), and a selected group contributes its descendants
 * @param property - Which end to read, named by ARROW_STYLE_KEYS so the pair cannot drift from the group the doc declares
 * @returns The mark; `none` when nothing in the selection declares `arrow`, which is what makes the row show "None" rather than the mixed marking
 */
export const readSelectionArrowType = (
	state: CanvasControllerState,
	property: (typeof ARROW_STYLE_KEYS)[number],
): SelectionValue<ArrowType> =>
	readSelectionValue(
		getEffectiveSelectedIds(state),
		state.objects,
		(object) => {
			if (!object.features?.arrow) {
				return undefined;
			}
			const value = (object as Record<string, unknown>)[property];
			return isString(value) ? (value as ArrowType) : UNSET_ARROW_TYPE;
		},
	);
