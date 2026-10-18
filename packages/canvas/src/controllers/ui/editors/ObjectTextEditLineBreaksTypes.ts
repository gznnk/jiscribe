/**
 * Whether the in-place editor may hold a line break in a text slot:
 *
 * - `"allow"`: the ordinary multi-line slot. Enter and Shift+Enter put a line
 *   break in the text.
 * - `"reject"`: a slot drawn one line tall from a fixed row height. Its region
 *   does not follow the draft, so a second line would spill over the row below;
 *   Enter commits the edit instead, Shift+Enter does nothing, and line breaks in
 *   pasted text become spaces.
 */
export type TextEditLineBreaks = "allow" | "reject";

/**
 * Reports whether one text slot takes line breaks. Static per type — the answer
 * may differ between a shape's slots but not between two shapes of the same
 * type, so no state is passed. A shape whose slots all behave alike can leave
 * the parameter out of its signature.
 *
 * `slotId` is a key of `state.text` (the authority on which slots a shape has).
 */
export type ObjectTextEditLineBreaksResolver = (
	slotId: string,
) => TextEditLineBreaks;
