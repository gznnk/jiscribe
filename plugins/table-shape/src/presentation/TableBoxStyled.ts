import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Table sub-parts. The cell rects are the shape's hit regions and carry
 * `data-part` (the cell id), which is what a double click resolves the edited cell
 * from. They capture pointer events even where nothing is painted, so a cell with
 * no background of its own is still grabbable.
 *
 * Only the wrapping <g> carries data-kind/data-id: one object is one data-kind
 * element, and getGestureTarget reads the nested data-part from there.
 */

/**
 * One cell: its background where it has one, and its hit region either way. No
 * `fill-opacity` is passed, so a cell's color is drawn as authored (the table has
 * no fill of its own to take an opacity from).
 */
export const TableCellSurface = styled.rect<FillPaintProps>`
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
