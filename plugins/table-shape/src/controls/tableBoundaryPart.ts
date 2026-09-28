/**
 * The boundary index a control's `data-part` carries, or null when the part
 * names none. One control is registered per axis and each of its handles appends
 * its own index (`selection:table:columnBoundary:2`), which is the segment the
 * gesture layer hands back as `SelectionControlEvent.subPart`.
 *
 * Non-negative integers written plainly are the whole of the contract: the
 * segment is DOM text, so `"1.5"`, `"1e1"` and `" 1"` are refused rather than
 * coerced into an index the grid never offered.
 *
 * @param subPart - The `data-part` segment after `selection:table:<name>:`, or undefined when the handle carries no index
 * @returns The boundary's index, 0-based from the table's leading edge; what it is an index into is the control's own business — the drag strips number the inner rules alone, the `+` badges every insertion position
 */
export const parseTableBoundaryIndex = (
	subPart: string | undefined,
): number | null =>
	subPart !== undefined && /^\d+$/.test(subPart) ? Number(subPart) : null;
