/**
 * IDs of the text slots an object can hold. A slot is one editable text region;
 * the ID identifies which region an editing session targets and is a key of
 * `state.text`, which is the authority on the slots a shape has. Only these two
 * are named here — a shape with several slots names its own (see TextSlots).
 */

/** The slot every single-text shape (rect, ellipse, sticky, ...) holds. */
export const BODY_TEXT_SLOT_ID = "body";

/** The connector's label, which lives in the nested `label.text` rather than in `state.text`. */
export const LABEL_TEXT_SLOT_ID = "label";
