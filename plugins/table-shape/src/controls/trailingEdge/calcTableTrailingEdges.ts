import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import type { TableAxis } from "../../grid/tableTrack";
import { readCachedTableLayout } from "../../layout/readCachedTableLayout";
import type { TableState } from "../../state/TableState";

/** One edge of the table as a segment in world coordinates. */
export type TableEdgeSegment = {
	/** The edge's end nearer the corner the table is drawn from. */
	from: Point;
	/** The edge's other end, the corner diagonal to the drawn one. */
	to: Point;
};

/**
 * Where the table's two trailing edges lie in world coordinates, keyed by the axis
 * whose last track each one closes: `column` the edge after the last column,
 * `row` the edge after the last row. Trailing means away from the corner the table
 * is drawn from (resizeTableHoldingEdges), which is the local top-left — so the
 * edges are the local right and bottom, and a table mirrored on an axis shows that
 * edge on the opposite side of the screen.
 *
 * Read from the layout rather than from the state's box, so the edges sit on the
 * outline even on the render before the content resizer has written the derived
 * size back — the same reason the drawing reads it (Table).
 *
 * @param table - The table to place; its center, rotation and flips transform the layout's local edges
 * @returns Both edges, each running its full length and ending at the corner diagonal to the drawn one
 */
export const calcTableTrailingEdges = (
	table: TableState,
): Record<TableAxis, TableEdgeSegment> => {
	const { cx, cy, rotation, scaleX, scaleY } = table;
	const { columnEdgeXs, rowEdgeYs } = readCachedTableLayout(table);
	const radians = degreesToRadians(rotation);
	const toWorld = (x: number, y: number): Point =>
		calcAffineTransformedPoint(x, y, scaleX, scaleY, radians, cx, cy);
	const right = columnEdgeXs[columnEdgeXs.length - 1];
	const bottom = rowEdgeYs[rowEdgeYs.length - 1];
	const farCorner = toWorld(right, bottom);
	return {
		column: { from: toWorld(right, rowEdgeYs[0]), to: farCorner },
		row: { from: toWorld(columnEdgeXs[0], bottom), to: farCorner },
	};
};
