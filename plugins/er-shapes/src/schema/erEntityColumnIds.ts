import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "./ErEntityDoc";
import type { ErEntityColumnField } from "./ErEntityDoc";

// The `col:` id grammar, every spelling of it in one place. A column is named by
// its part id `col:<index>`; its three text slots and its two connect points
// append one segment to that (`col:<index>:key`, `col:<index>:right`). All of
// them are positional — the index in the doc's `columns` — so an insertion or a
// removal ahead of a column renames it. Never written to a document except the
// connect point ids a connector's endpoint names; the slot and part ids are
// rebuilt from the index on every read.

/** Which edge of the box a column's connect point sits on. */
export type ErEntityColumnConnectPointSide = "left" | "right";

/** The second segment a column connect point id may carry. */
const ER_ENTITY_COLUMN_CONNECT_POINT_SIDES: readonly ErEntityColumnConnectPointSide[] =
	["left", "right"];

/** `col:<index>`, optionally followed by one more segment: the whole grammar, read once. */
const ER_ENTITY_COLUMN_ID_PATTERN = /^col:(\d+)(?::([a-z]+))?$/;

/** An id split into its column index and the segment after it, or null outside the grammar. */
const splitErEntityColumnId = (
	id: string,
): { columnIndex: number; segment: string | undefined } | null => {
	const matched = ER_ENTITY_COLUMN_ID_PATTERN.exec(id);
	if (matched === null) {
		return null;
	}
	return { columnIndex: Number(matched[1]), segment: matched[2] };
};

/**
 * The part id one column is named by (`"erEntityColumn"` parts), and the prefix
 * of its slot ids and connect point ids.
 *
 * @param columnIndex - Index into the doc's `columns`, 0-based, in declared order
 * @returns The part id, e.g. `col:2`
 */
export const erEntityColumnPartId = (columnIndex: number): string =>
	`col:${columnIndex}`;

/**
 * The column index one part id names — the inverse of {@link erEntityColumnPartId}.
 *
 * @param partId - The id to read, or undefined for a grip whose action carries no index segment; a slot id such as `col:2:name` is refused rather than read as its column
 * @returns The 0-based index, or null when the text is not a column part id; whether the entity has that column is the caller's to check
 */
export const parseErEntityColumnPartId = (
	partId: string | undefined,
): number | null => {
	if (partId === undefined) {
		return null;
	}
	const split = splitErEntityColumnId(partId);
	return split === null || split.segment !== undefined
		? null
		: split.columnIndex;
};

/**
 * The slot id one text of one column is keyed by in state, and the id half of the
 * `data-part` its element carries (textSlotPart).
 *
 * @param columnIndex - Index into the doc's `columns`, 0-based, in declared order
 * @param field - Which of the column's three texts
 * @returns The slot id, e.g. `col:2:type`
 */
export const erEntityColumnTextSlotId = (
	columnIndex: number,
	field: ErEntityColumnField,
): string => `${erEntityColumnPartId(columnIndex)}:${field}`;

/**
 * The column and field one slot id names — the inverse of
 * {@link erEntityColumnTextSlotId}.
 *
 * @param slotId - A slot id as `state.text` keys it; the title's `name` and anything outside the exact grammar are refused rather than coerced
 * @returns The 0-based column index and the field, or null when the id is not a column slot id
 */
export const parseErEntityColumnTextSlotId = (
	slotId: string,
): { columnIndex: number; field: ErEntityColumnField } | null => {
	const split = splitErEntityColumnId(slotId);
	const field = ER_ENTITY_COLUMN_FIELDS.find(
		(candidate) => candidate === split?.segment,
	);
	if (split === null || field === undefined) {
		return null;
	}
	return { columnIndex: split.columnIndex, field };
};

/**
 * Id of the connect point on one side of one column's row, as a saved doc stores
 * it (`{ "kind": "connectPoint", "id": "col:1:right" }`).
 *
 * @param columnIndex - Index into the doc's `columns`, 0-based, in declared order
 * @param side - Which edge of the box the point sits on
 * @returns The id, e.g. `col:1:right`
 */
export const erEntityColumnConnectPointId = (
	columnIndex: number,
	side: ErEntityColumnConnectPointSide,
): string => `${erEntityColumnPartId(columnIndex)}:${side}`;

/**
 * The column and side one connect point id names — the inverse of
 * {@link erEntityColumnConnectPointId}.
 *
 * @param connectPointId - A connect point id as an endpoint stores it; the built-in edge midpoints (`rightCenter`) and anything outside the exact grammar are refused
 * @returns The 0-based column index and the side, or null when the id is not a column connect point id
 */
export const parseErEntityColumnConnectPointId = (
	connectPointId: string,
): { columnIndex: number; side: ErEntityColumnConnectPointSide } | null => {
	const split = splitErEntityColumnId(connectPointId);
	const side = ER_ENTITY_COLUMN_CONNECT_POINT_SIDES.find(
		(candidate) => candidate === split?.segment,
	);
	if (split === null || side === undefined) {
		return null;
	}
	return { columnIndex: split.columnIndex, side };
};

/**
 * Every slot id of an entity, in the order they are keyed into state: the title
 * first, then each column's key, name and type in declared order. That order is
 * what Tab walks (TextSlots) and what makes the title the slot Enter opens.
 *
 * @param columnCount - Number of columns; 0 yields the title alone
 * @returns Freshly built ids the caller may keep
 */
export const erEntityTextSlotIds = (columnCount: number): string[] => {
	const ids = [ER_ENTITY_NAME_TEXT_SLOT_ID];
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
		for (const field of ER_ENTITY_COLUMN_FIELDS) {
			ids.push(erEntityColumnTextSlotId(columnIndex, field));
		}
	}
	return ids;
};

/**
 * How many columns a slot map holds: the run of column indices from 0 whose name
 * slot is present. The state keeps no column count of its own, the slots being
 * the columns.
 *
 * @param text - The entity's slots, keyed by slot id; undefined counts as none
 * @returns The column count; a gap in the indices ends the count there
 */
export const countErEntityColumns = (
	text: Readonly<Record<string, unknown>> | undefined,
): number => {
	if (text === undefined) {
		return 0;
	}
	let columnCount = 0;
	while (erEntityColumnTextSlotId(columnCount, "name") in text) {
		columnCount++;
	}
	return columnCount;
};
