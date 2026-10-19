import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";

/**
 * One object's text slots, or undefined for an object holding none.
 *
 * The single place `text` is read off an ObjectState, which is why the cast to
 * the text-holding half of the state lives here — whether a type carries text is
 * its `features`' business, so every side that reaches for the slots has to ask
 * the object and be ready for the answer to be nothing.
 *
 * @param object - The object to read; the slots come back as it holds them, never copied
 */
export const textSlotsOf = (object: ObjectState): TextSlots | undefined =>
	(object as ObjectState & TextStyleState).text;
