import type { ObjectPartKindDefinition } from "@jiscribe/canvas";
import type { Rect } from "@jiscribe/geometry";

import { removeTableTracks } from "../grid/removeTableTracks";
import {
	countTableTracks,
	parseTableTrackPartId,
	tableTrackPartId,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { calcTableLayout } from "../layout/calcTableLayout";
import { tableCellSlotId } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/** The band one track covers, in the table's local coordinates. */
const calcTrackRegion = (
	state: TableState,
	axis: TableAxis,
	index: number,
): Rect => {
	const { columnXs, rowYs, width, height } = calcTableLayout(state);
	return axis === "row"
		? {
				x: columnXs[0],
				y: rowYs[index],
				width,
				height: rowYs[index + 1] - rowYs[index],
			}
		: {
				x: columnXs[index],
				y: rowYs[0],
				width: columnXs[index + 1] - columnXs[index],
				height,
			};
};

/**
 * The part definition for whole rows or whole columns — the kind a grip's click
 * writes ({@link import("../controls/handleTableTrackGrip").createTableTrackGripHandler}).
 *
 * Kept apart from the cells, which ride core's `"textSlot"` kind, because the two
 * answer Delete differently: a row selected as a row is removed, where the very
 * same cells selected as cells only lose their text (clearTableCells). One kind
 * could not mean both.
 *
 * `list` is declared so a range of tracks is expressible at all — core builds one
 * from the order this returns — even though a grip writes a single index today.
 *
 * What the two kinds do share is the cells: a style stored on a cell (the
 * background, the typography) lands on the cells of the picked tracks, which is
 * what `textSlotIds` states. Without it a track would name no slot at all and
 * such a write would fall back to the whole grid.
 *
 * @param axis - Which direction the tracks run in; also the `kind` the definition registers under, the two being the same word (see TableAxis)
 * @returns A definition to put in the type's `ObjectTypeDefinition.parts`
 */
export const createTableTrackPartDefinition = (
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

	textSlotIds: (object, partIds) => {
		const crossCount = countTableTracks(
			object,
			axis === "row" ? "column" : "row",
		);
		const cellIds: string[] = [];
		for (const partId of partIds) {
			const index = parseTableTrackPartId(partId);
			if (index === null) {
				continue;
			}
			for (let cross = 0; cross < crossCount; cross++) {
				cellIds.push(
					axis === "row"
						? tableCellSlotId(index, cross)
						: tableCellSlotId(cross, index),
				);
			}
		}
		return cellIds;
	},

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
