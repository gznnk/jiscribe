import type { Mods } from "@jiscribe/canvas";

/**
 * The boundary index a control's `data-action` carries, or null when it
 * names none. One control is registered per axis and each of its handles appends
 * its own index (`selection:table:columnBoundary:2`), which is the segment the
 * gesture layer hands back as `SelectionControlEvent.subAction`.
 *
 * Non-negative integers written plainly are the whole of the contract: the
 * segment is DOM text, so `"1.5"`, `"1e1"` and `" 1"` are refused rather than
 * coerced into an index the grid never offered.
 *
 * @param subAction - The `data-action` segment after `selection:table:<name>:`, or undefined when the handle carries no index
 * @returns The boundary's index, 0-based from the table's leading edge; the drag strips number the inner rules alone, the outer edges not counted
 */
export const parseTableBoundaryIndex = (
	subAction: string | undefined,
): number | null =>
	subAction !== undefined && /^\d+$/.test(subAction) ? Number(subAction) : null;

/**
 * How a boundary drag shares out its distance. `"leading"` resizes the track
 * before the boundary alone (the column on its left, the row above it) and lets
 * the table grow or shrink; `"pair"` trades between the two tracks either side
 * and keeps the table's outer frame where it is.
 */
export type TableBoundaryDragMode = "leading" | "pair";

/**
 * The mode a boundary drag runs in this frame: Shift held trades between the
 * pair, anything else resizes the leading track alone.
 *
 * @param mods - The modifiers of the current drag frame, not of gesture start, so pressing or releasing Shift mid-drag switches mode on the next frame
 */
export const readTableBoundaryDragMode = (mods: Mods): TableBoundaryDragMode =>
	mods.shift ? "pair" : "leading";
