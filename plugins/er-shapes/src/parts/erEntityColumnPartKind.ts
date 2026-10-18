import type { ObjectPartKindDefinition } from "@jiscribe/canvas";

import { removeErEntityColumns } from "../columns/removeErEntityColumns";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import {
	countErEntityColumns,
	erEntityColumnPartId,
	erEntityColumnTextSlotId,
	parseErEntityColumnPartId,
} from "../schema/erEntityColumnIds";
import { ER_ENTITY_COLUMN_FIELDS } from "../schema/ErEntityDoc";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * Part kind of one whole column — the three slots of one row taken as one thing,
 * which is what a column grip's click writes (ErEntityColumnGripControl) and what
 * Delete removes. Distinct from `"textSlot"` on purpose: Delete over a picked slot
 * empties its text, over a picked column it removes the column.
 */
export const ER_ENTITY_COLUMN_PART_KIND = "erEntityColumn";

/**
 * The part definition for whole columns — the kind a column grip's click writes
 * (ErEntityColumnGripControl).
 *
 * Several columns at once: the grip's Shift and Ctrl / Meta clicks
 * (handleErEntityColumnGrip) and Shift+Up / Down (extendErEntityColumnSelection)
 * write ranges, which run over `list` — the declared order, the rows' order top
 * to bottom, so a range covers the rows between its ends. `delete` is what
 * Delete removes the picked columns through when no command of this package
 * claims the key first (erEntity.deleteColumn moves the pick on to the next
 * column as well).
 *
 * No `styleIntentKinds`, so a column pick leaves the entity the subject of every
 * menu control; the text ones land on the picked columns' three slots, as a
 * table row pick's land on its cells.
 */
export const ER_ENTITY_COLUMN_PART_DEFINITION: ObjectPartKindDefinition<ErEntityState> =
	{
		kind: ER_ENTITY_COLUMN_PART_KIND,

		has: (object, partId) => {
			const columnIndex = parseErEntityColumnPartId(partId);
			return (
				columnIndex !== null && columnIndex < countErEntityColumns(object.text)
			);
		},

		list: (object) =>
			Array.from(
				{ length: countErEntityColumns(object.text) },
				(_, columnIndex) => erEntityColumnPartId(columnIndex),
			),

		multiPick: true,

		region: (object, partId) => {
			const columnIndex = parseErEntityColumnPartId(partId);
			if (columnIndex === null) {
				return null;
			}
			return readCachedErEntityLayout(object).rows[columnIndex]?.band ?? null;
		},

		delete: (object, partIds) =>
			removeErEntityColumns(
				object,
				partIds
					.map(parseErEntityColumnPartId)
					.filter((columnIndex): columnIndex is number => columnIndex !== null),
			),

		textSlotIds: (_object, partIds) =>
			partIds.flatMap((partId) => {
				const columnIndex = parseErEntityColumnPartId(partId);
				return columnIndex === null
					? []
					: ER_ENTITY_COLUMN_FIELDS.map((field) =>
							erEntityColumnTextSlotId(columnIndex, field),
						);
			}),
	};
