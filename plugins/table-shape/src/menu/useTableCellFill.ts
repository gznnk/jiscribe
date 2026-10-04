import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import type { SelectionValue } from "@jiscribe/canvas-sdk";
import {
	readSelectionSlotField,
	useObjectPartKindRegistry,
} from "@jiscribe/canvas-sdk";

import { TABLE_CELL_FILL_FIELD } from "../schema/TableDoc";

/**
 * What the two cell-background controls are handed in common: the selection,
 * which carries the cells picked below it, and the objects it names. Both
 * surfaces' props carry these two fields (ObjectMenuItemProps /
 * PropertyPanelItemProps), so naming them once is what stops the controls from
 * resolving different cells.
 */
export type TableCellFillSource = Pick<
	ObjectMenuItemProps,
	"objects" | "selection"
>;

/**
 * What the cells a cell-background write would land on say about it: the value
 * they agree on, `mixed` where they do not, `none` where nothing selected holds
 * cells. `undefined` inside a `single` or among a `mixed` is a cell carrying no
 * background at all, which is not a color (see TableCell).
 *
 * The cells read are the picked ones — a picked row or column being its own
 * cells (tableTrackParts) — and every cell of the table when none are picked,
 * which is exactly where the write goes (readSelectionSlotField).
 *
 * @param source - The selection the control was drawn for; it is the one both
 *   surfaces hand their custom items, which is `state.selection` as the reducer
 *   left it (reconcileObjectPartSelection)
 * @returns The folded value, ready for `selectionValueOr` / `selectionMixedValues`
 */
export const useTableCellFill = (
	source: TableCellFillSource,
): SelectionValue<string | undefined> => {
	const objectPartKind = useObjectPartKindRegistry();
	return readSelectionSlotField(
		source.selection,
		source.objects,
		objectPartKind,
		TABLE_CELL_FILL_FIELD,
	);
};
