import type { ObjectPartKindDefinition } from "@jiscribe/canvas";
import { TEXT_STYLE_INTENT_KINDS } from "@jiscribe/canvas-sdk";

import { listErEntityColumnSourcesForRemoval } from "../columns/removeErEntityColumns";
import { rewriteErEntityColumnsWithRemap } from "../columns/rewriteErEntityColumnsWithConnectors";
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
 * to bottom, so a range covers the rows between its ends. `delete` — the
 * built-in Delete's, from the key and the context menu alike — removes the
 * picked columns and answers where their connect points go, so the connectors
 * on the columns behind follow them and those on a removed one stay on its side
 * of the box (rewriteErEntityColumnsWithRemap).
 *
 * A column pick receives what a slot pick does (TEXT_STYLE_INTENT_KINDS), so
 * the menus offer the text controls alone, which land on the picked columns'
 * three slots (`textSlotIds`); the entity's fill and border are not the
 * column's.
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

		delete: (object, partIds) => {
			const columnSources = listErEntityColumnSourcesForRemoval(
				object,
				partIds
					.map(parseErEntityColumnPartId)
					.filter((columnIndex): columnIndex is number => columnIndex !== null),
			);
			return columnSources === null
				? null
				: rewriteErEntityColumnsWithRemap(object, columnSources);
		},

		styleIntentKinds: TEXT_STYLE_INTENT_KINDS,

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
