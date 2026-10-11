import type { ObjectPartKindDefinition } from "@jiscribe/canvas";
import type { Rect } from "@jiscribe/geometry";

import { removeTableTracks } from "../grid/removeTableTracks";
import {
	countTableTracks,
	parseTableTrackPartId,
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
	tableTrackPartId,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import type { TableState } from "../state/TableState";

/** The band one track covers, in the table's local coordinates. */
const calcTrackRegion = (
	state: TableState,
	axis: TableAxis,
	index: number,
): Rect => {
	const { columnEdgeXs, rowEdgeYs, width, height } =
		readCachedTableLayout(state);
	return axis === "row"
		? {
				x: columnEdgeXs[0],
				y: rowEdgeYs[index],
				width,
				height: rowEdgeYs[index + 1] - rowEdgeYs[index],
			}
		: {
				x: columnEdgeXs[index],
				y: rowEdgeYs[0],
				width: columnEdgeXs[index + 1] - columnEdgeXs[index],
				height,
			};
};

/**
 * The part definition for whole rows or whole columns — the kind a grip's click
 * writes ({@link import("../controls/createTableTrackGripHandler").createTableTrackGripHandler}).
 *
 * Kept apart from the cells, which ride core's `"textSlot"` kind, because the two
 * answer Delete differently: a row selected as a row is removed, where the very
 * same cells selected as cells only lose their text (clearTableCells). One kind
 * could not mean both.
 *
 * `list` is declared so a range of tracks is expressible at all — core builds one
 * from the order this returns — even though a grip writes a single index today.
 *
 * What the two kinds do share is the cells: a style written over a track pick
 * lands on that track's cells (tableSlotsOf).
 *
 * @param axis - Which direction the tracks run in; also the `kind` the definition registers under, the two being the same word (see TableAxis)
 * @returns A definition for {@link TABLE_TRACK_PART_DEFINITIONS}
 */
const createTableTrackPartDefinition = (
	axis: TableAxis,
): ObjectPartKindDefinition<TableState> => ({
	kind: axis,

	has: (object, partId) => {
		const index = parseTableTrackPartId(partId);
		return index !== null && index < countTableTracks(object, axis);
	},

	list: (object) =>
		Array.from({ length: countTableTracks(object, axis) }, (_unused, index) =>
			tableTrackPartId(index),
		),

	region: (object, partId) => {
		const index = parseTableTrackPartId(partId);
		return index === null || index >= countTableTracks(object, axis)
			? null
			: calcTrackRegion(object, axis, index);
	},

	delete: (object, partIds) =>
		removeTableTracks(
			object,
			axis,
			partIds
				.map(parseTableTrackPartId)
				.filter((index): index is number => index !== null),
		),
});

/**
 * The one definition per axis, built once: what the type registers under
 * `partKinds` and what the grips expand a track selection through
 * (collectObjectPartIds), so both read a range the same way.
 */
export const TABLE_TRACK_PART_DEFINITIONS: Readonly<
	Record<TableAxis, ObjectPartKindDefinition<TableState>>
> = {
	row: createTableTrackPartDefinition(TABLE_ROW_PART_KIND),
	column: createTableTrackPartDefinition(TABLE_COLUMN_PART_KIND),
};
