import type { ObjectPartKindDefinition } from "@jiscribe/canvas";
import { TEXT_STYLE_INTENT_KINDS } from "@jiscribe/canvas-sdk";
import type { Rect } from "@jiscribe/geometry";

import { ER_ENTITY_LANES, parseErEntityLanePartId } from "./erEntityLaneIds";
import type { ErEntityLane } from "./erEntityLaneIds";
import { calcErEntityColumnSlotBand } from "../layout/calcErEntityColumnSlotBand";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import { clearErEntityTextSlots } from "../state/clearErEntityTextSlots";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * Part kind of one whole lane — key, name or type down every row — which is what
 * a lane grip's click writes (ErEntityLaneGripControl).
 */
export const ER_ENTITY_LANE_PART_KIND = "erEntityLane";

/** Every row's slot of the named lanes, row by row in declared order. */
const collectErEntityLaneTextSlotIds = (
	object: ErEntityState,
	partIds: readonly string[],
): string[] => {
	const lanes = partIds
		.map(parseErEntityLanePartId)
		.filter((lane): lane is ErEntityLane => lane !== null);
	const columnCount = countErEntityColumns(object.text);
	const slotIds: string[] = [];
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
		for (const lane of lanes) {
			slotIds.push(erEntityColumnTextSlotId(columnIndex, lane));
		}
	}
	return slotIds;
};

/** The band one lane covers: its width, from the top of the first row to the bottom of the last, in local coordinates. */
const calcErEntityLaneRegion = (
	object: ErEntityState,
	lane: ErEntityLane,
): Rect | null => {
	const layout = readCachedErEntityLayout(object);
	const firstRow = layout.rows[0];
	const lastRow = layout.rows[layout.rows.length - 1];
	if (firstRow === undefined || lastRow === undefined) {
		return null;
	}
	const rowsBand: Rect = {
		...firstRow.band,
		height: lastRow.band.y + lastRow.band.height - firstRow.band.y,
	};
	return calcErEntityColumnSlotBand(layout, rowsBand, lane);
};

/**
 * The part definition for whole lanes, built as a table's track part is
 * (TABLE_TRACK_PART_DEFINITIONS): what a lane pick reaches is the slots of
 * that lane in every row.
 *
 * The three lanes are fixed and exist only while the entity has a row, so an
 * entity of no columns has none to list or pick. `list` runs left to right
 * (ER_ENTITY_LANES), the run a Shift-click on a lane grip spans.
 *
 * A lane cannot be removed, so `delete` empties its slots, as Delete over picked
 * slots does (clearErEntityTextSlots), and refuses when they are empty already.
 * A lane pick receives what a slot pick does (TEXT_STYLE_INTENT_KINDS), and a
 * text style written over it lands on its slots (`textSlotIds`).
 */
export const ER_ENTITY_LANE_PART_DEFINITION: ObjectPartKindDefinition<ErEntityState> =
	{
		kind: ER_ENTITY_LANE_PART_KIND,

		has: (object, partId) =>
			parseErEntityLanePartId(partId) !== null &&
			countErEntityColumns(object.text) > 0,

		list: (object) =>
			countErEntityColumns(object.text) > 0 ? [...ER_ENTITY_LANES] : [],

		multiPick: true,

		region: (object, partId) => {
			const lane = parseErEntityLanePartId(partId);
			return lane === null ? null : calcErEntityLaneRegion(object, lane);
		},

		delete: (object, partIds) => {
			const clearedEntity = clearErEntityTextSlots(
				object,
				collectErEntityLaneTextSlotIds(object, partIds),
			);
			return clearedEntity === null ? null : { object: clearedEntity };
		},

		styleIntentKinds: TEXT_STYLE_INTENT_KINDS,

		textSlotIds: collectErEntityLaneTextSlotIds,
	};
