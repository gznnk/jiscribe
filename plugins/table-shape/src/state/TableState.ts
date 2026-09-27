import type { CreateObjectState } from "@jiscribe/canvas";

import type {
	TableCell,
	TableColumnDoc,
	TableFeatures,
	TableRowDoc,
} from "../schema/TableDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TableStateBrand: unique symbol;

/**
 * A table at runtime. `width` / `height` / `cx` / `cy` come from the point
 * geometry's Frame and are derived, not stored: the content resizer rewrites
 * them from the columns and the resolved row heights whenever the cells change
 * (see calcTableFrameSize).
 *
 * `text` is narrowed to the cells. It is the same map the slot machinery reads —
 * which is what makes the shared rendering, editing and text styling work on a
 * table with nothing added — while this type says what a slot of *this* shape
 * holds.
 *
 * The cell ids in `text` are exactly `tableCellSlotIds(rows.length,
 * columns.length)`, no more and no fewer. Everything that adds or removes a row
 * or a column goes through the one function that keeps that true.
 */
export type TableState = CreateObjectState<
	typeof TableFeatures,
	typeof TableStateBrand,
	{
		columns: TableColumnDoc[];
		rows: TableRowDoc[];
		text: Record<string, TableCell>;
	}
>;
