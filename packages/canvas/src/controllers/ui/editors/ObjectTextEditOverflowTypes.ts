/**
 * What the in-place editor does when the text being typed outgrows the slot's
 * region (see calcTextRegion):
 *
 * - `"scroll"`: the editor keeps the region's height and scrolls inside it, so
 *   the box the shape draws stays the box the caret moves in.
 * - `"grow"`: the editor takes the region's height as a minimum and extends
 *   downward as far as the shape's bottom edge, scrolling once that is used up,
 *   for a slot whose region is itself derived from the text and therefore
 *   follows the draft keystroke by keystroke (the record's title band).
 *
 * A region that does *not* follow the draft must stay `"scroll"`: growing there
 * would let the editor spill over whatever is drawn below it.
 */
export type TextEditOverflow = "scroll" | "grow";

/**
 * Reports the overflow behavior of one text slot. Static per type — the answer
 * may differ between a shape's slots but not between two shapes of the same
 * type, so no state is passed. A shape whose slots all behave alike can leave
 * the parameter out of its signature.
 *
 * `slotId` is a key of `state.text` (the authority on which slots a shape has).
 */
export type ObjectTextEditOverflowResolver = (
	slotId: string,
) => TextEditOverflow;
