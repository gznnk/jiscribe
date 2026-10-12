import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Table sub-parts. The cell rects are the shape's hit regions and carry
 * `data-part` (the cell's address, textSlotPart), which is what a click picks the
 * cell by and a double click resolves the edited cell from. They capture pointer events even where nothing is painted, so a cell with
 * no background of its own is still grabbable.
 *
 * Only the wrapping <g> carries data-kind/data-id: one object is one data-kind
 * element, and getGestureTarget reads the nested data-part from there.
 */

/**
 * Background of the whole table, under every cell: what a cell with no `fill`
 * of its own, or a transparent one, shows. `pointer-events: none` leaves every hit to the cells above
 * it, which carry the data-part a click is resolved by.
 */
export const TableBody = styled.rect<FillPaintProps>`
	${fillPaint}
	stroke: none;
	pointer-events: none;
`;

/**
 * One cell: its background where it has one, and its hit region either way. No
 * `fill-opacity` is passed, so a cell's color is drawn as authored: it is the
 * cell's own color, not a tint of the table's, so the table's `fillOpacity` does
 * not reach it.
 */
export const TableCellBody = styled.rect<FillPaintProps>`
	${fillPaint}
	stroke: none;
	pointer-events: all;
	cursor: grab;
`;

/**
 * One rule between two cells. Shares the border's linework (same color, width and
 * dash, passed as attributes) so it reads as part of the outline.
 * `pointer-events: none` keeps it from stealing the hit from the cells it
 * divides — which would lose the cell's data-part.
 */
export const TableRule = styled.line<StrokePaintProps>`
	${strokePaint}
	pointer-events: none;
`;

/**
 * Border. `fill: none` so it never covers the cells beneath it; only the painted
 * stroke captures, which keeps the table edge grabbable.
 */
export const TableOutline = styled.rect<StrokePaintProps>`
	fill: none;
	${strokePaint}
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
