/**
 * IDs of the text slots an object can hold. A slot is one editable text region;
 * the ID identifies which region an editing session targets and is a key of
 * `state.text`, which is the authority on the slots a shape has. Only the shared
 * one is named here — a shape with several slots names its own (see TextSlots),
 * and a connector's label is not a slot (textEditState kind "connectorLabel").
 */

/** The slot every single-text shape (rect, ellipse, callout, ...) holds. */
export const BODY_TEXT_SLOT_ID = "body";
