import type { TextVerticalBasis } from "@jiscribe/doc/model/objects/types/TextVerticalBasis";
import { isTextVerticalBasis } from "@jiscribe/doc/model/objects/types/TextVerticalBasis";

import { isTextSlots, type TextSlots } from "../types/TextSlots";

/**
 * Text in runtime state: the keyed slots, plus the placement of a single body
 * that belongs to the shape rather than to a slot. Styling is a property of each
 * slot (TextSlot), so there is no shape-wide copy of that here — one style, one
 * place to read and write it.
 */
export type TextStyleState = {
	/**
	 * Text content and styling, keyed by slot id (see TextSlots). Optional only
	 * because a text-less type shares this state shape: a type declaring
	 * `features.text` always carries it, which `isValidTextStyleState` enforces on
	 * untrusted state.
	 */
	text?: TextSlots;
	/**
	 * Box the body's `verticalAlign` is measured against, applied by
	 * `calcTextRegion`; absent = the type's own declared region, which is what
	 * every document written before the field existed means. Only a
	 * `features.text: "body"` type ever carries it — the mapper sets it in that
	 * branch alone, a slot having no shape-wide box to be placed against.
	 */
	textVerticalBasis?: TextVerticalBasis;
};

/**
 * Type guard to check if an object has text properties (TextStyleState).
 *
 * @param obj - The object to check; one carrying no `text` at all passes
 * @returns True if `text` is absent or is the keyed normal form with every slot valid, and `textVerticalBasis` is absent or one of the two basis names
 */
export const isTextStyleState = (obj: unknown): obj is TextStyleState => {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}

	const candidate = obj as Record<string, unknown>;

	if (
		"textVerticalBasis" in candidate &&
		candidate.textVerticalBasis !== undefined &&
		!isTextVerticalBasis(candidate.textVerticalBasis)
	) {
		return false;
	}

	// If the text property is present, it must be the keyed normal form
	if ("text" in candidate && candidate.text !== undefined) {
		return isTextSlots(candidate.text);
	}

	return true;
};
