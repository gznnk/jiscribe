import type { ExtraConnectPoint } from "@jiscribe/canvas";

import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityLayoutInput } from "../layout/readErEntityLayoutSource";
import { erEntityColumnConnectPointId } from "../schema/erEntityColumnIds";

/**
 * Two connect points per column, on the left and right edges at the height of the
 * column's row, each leaving outward — the place a foreign key's line starts and
 * the referenced primary key's line ends. Offered on top of the top and bottom
 * edge midpoints; the left and right midpoints are hidden while the entity has a
 * column (calcErEntityConnectionAnchors), every row already offering a point on
 * both edges.
 *
 * @param state - The entity's slot widths and slots; the box is derived from them (readCachedErEntityLayout), its own width and height not read
 * @returns Every column's points in declared column order, left before right, in local coordinates (shape center as origin)
 */
export const calcErEntityConnectPoints = (
	state: ErEntityLayoutInput,
): readonly ExtraConnectPoint[] => {
	const layout = readCachedErEntityLayout(state);
	return layout.rows.flatMap(({ columnIndex, band }) => {
		const rowCenterY = band.y + band.height / 2;
		return [
			{
				id: erEntityColumnConnectPointId(columnIndex, "left"),
				point: { x: -layout.width / 2, y: rowCenterY },
				direction: { x: -1, y: 0 },
			},
			{
				id: erEntityColumnConnectPointId(columnIndex, "right"),
				point: { x: layout.width / 2, y: rowCenterY },
				direction: { x: 1, y: 0 },
			},
		];
	});
};
