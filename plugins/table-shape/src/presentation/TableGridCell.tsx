import { textSlotPart } from "@jiscribe/canvas";
import { memo } from "react";
import type React from "react";

import { resolveCellPaint } from "./resolveCellPaint";
import { TableCellBody } from "./TableStyled";

type TableGridCellProps = {
	/** The cell's text slot id (tableCellTextSlotId), which its `data-part` address is built from. */
	cellId: string;
	/** Left edge in the table's local coordinates (origin at its center). */
	x: number;
	/** Top edge, likewise local. */
	y: number;
	/** The column's full width, rules included. */
	width: number;
	/** The row's resolved height, rules included. */
	height: number;
	/** The cell's `fill` as stored (TableCell); undefined paints nothing. */
	fill: string | undefined;
};

/**
 * One cell's surface. Its box arrives as numbers rather than as the layout's rect
 * because every re-layout hands over new rects: compared by value, an edit to one
 * cell redraws only the cells whose box or fill it actually moved.
 */
const TableGridCellComponent: React.FC<TableGridCellProps> = ({
	cellId,
	x,
	y,
	width,
	height,
	fill,
}) => (
	<TableCellBody
		data-part={textSlotPart(cellId)}
		x={x}
		y={y}
		width={width}
		height={height}
		fillColor={resolveCellPaint(fill)}
	/>
);

export const TableGridCell = memo(TableGridCellComponent);
