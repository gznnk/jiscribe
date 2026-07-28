import { isTextSlots, type TextSlots } from "../types/TextSlots";

/**
 * Text in runtime state: the keyed slots and nothing else. Styling is a property
 * of each slot (TextSlot), so there is no shape-wide copy here — one style, one
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
};

/**
 * Type guard to check if an object has text properties (TextStyleState).
 *
 * @param obj - The object to check; one carrying no `text` at all passes
 * @returns True if `text` is absent or is the keyed normal form with every slot valid
 */
export const isTextStyleState = (obj: unknown): obj is TextStyleState => {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}

	const candidate = obj as Record<string, unknown>;

	// If the text property is present, it must be the keyed normal form
	if ("text" in candidate && candidate.text !== undefined) {
		return isTextSlots(candidate.text);
	}

	return true;
};
