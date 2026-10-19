import {
	erEntityColumnTextSlotId,
	parseErEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";
import type { ErEntityState } from "../state/ErEntityState";

/** The row the title stands in: one above column 0, spanning every field. */
const TITLE_ROW = -1;

/** One corner of a range as a grid cell: its row and the fields it spans. */
type ErEntityTextSlotCorner = {
	row: number;
	firstFieldIndex: number;
	lastFieldIndex: number;
};

/** Where a slot stands in the grid, or null for an id that names no slot of an entity. */
const readErEntityTextSlotCorner = (
	slotId: string,
): ErEntityTextSlotCorner | null => {
	if (slotId === ER_ENTITY_NAME_TEXT_SLOT_ID) {
		return {
			row: TITLE_ROW,
			firstFieldIndex: 0,
			lastFieldIndex: ER_ENTITY_COLUMN_FIELDS.length - 1,
		};
	}
	const columnSlot = parseErEntityColumnTextSlotId(slotId);
	if (columnSlot === null) {
		return null;
	}
	const fieldIndex = ER_ENTITY_COLUMN_FIELDS.indexOf(columnSlot.field);
	return {
		row: columnSlot.columnIndex,
		firstFieldIndex: fieldIndex,
		lastFieldIndex: fieldIndex,
	};
};

/** hasOwnProperty rather than `in`: "toString" is no slot. */
const holdsTextSlot = (state: ErEntityState, slotId: string): boolean =>
	Object.prototype.hasOwnProperty.call(state.text, slotId);

/**
 * The slots a Shift-click widens the pick to: the rectangle the anchor and the
 * clicked slot stand at opposite corners of, the columns being the rows and key,
 * name and type the fields. The title is a full-width row above column 0, so a
 * range touching it covers the title and every field of the rows down to the
 * other corner. Core's default would take the slice of the slot order between
 * them instead, which drags in every slot right of the anchor on a two-row reach.
 *
 * Registered as the `range` of the entity's `"textSlot"` part (see
 * {@link import("../definition").erEntityDefinition}), and called by the
 * Shift+arrow steps through it.
 *
 * @param state - The entity the two ids name slots of; read only, and the slots it holds now decide which of them still exist
 * @param anchorSlotId - The corner the range is measured from, the slot a plain click last left picked; which corner comes first in the grid does not matter
 * @param focusSlotId - The other corner, the slot just clicked or stepped to
 * @returns The covered slots in the order `state.text` keys them (the title first, then row by row key, name, type), or `[focusSlotId]` alone when either id is not a slot the entity holds — a stale corner collapses the pick rather than widening it to something arbitrary
 */
export const collectErEntityTextSlotRange = (
	state: ErEntityState,
	anchorSlotId: string,
	focusSlotId: string,
): string[] => {
	const anchor = readErEntityTextSlotCorner(anchorSlotId);
	const focus = readErEntityTextSlotCorner(focusSlotId);
	if (
		anchor === null ||
		focus === null ||
		!holdsTextSlot(state, anchorSlotId) ||
		!holdsTextSlot(state, focusSlotId)
	) {
		return [focusSlotId];
	}
	const firstRow = Math.min(anchor.row, focus.row);
	const lastRow = Math.max(anchor.row, focus.row);
	const firstFieldIndex = Math.min(
		anchor.firstFieldIndex,
		focus.firstFieldIndex,
	);
	const lastFieldIndex = Math.max(anchor.lastFieldIndex, focus.lastFieldIndex);

	const slotIds: string[] = [];
	if (firstRow === TITLE_ROW) {
		slotIds.push(ER_ENTITY_NAME_TEXT_SLOT_ID);
	}
	for (let row = Math.max(firstRow, 0); row <= lastRow; row++) {
		for (
			let fieldIndex = firstFieldIndex;
			fieldIndex <= lastFieldIndex;
			fieldIndex++
		) {
			const slotId = erEntityColumnTextSlotId(
				row,
				ER_ENTITY_COLUMN_FIELDS[fieldIndex],
			);
			if (holdsTextSlot(state, slotId)) {
				slotIds.push(slotId);
			}
		}
	}
	return slotIds;
};
