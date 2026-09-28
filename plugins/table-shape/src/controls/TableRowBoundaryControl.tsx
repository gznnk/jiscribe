import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import { TableBoundaryStrip } from "./TableBoundaryStrip";
import { calcTableLayout } from "../layout/calcTableLayout";
import type { TableState } from "../state/TableState";

/**
 * Handles for the boundaries between rows: one strip per horizontal rule, running
 * the full width of the table. The strip's `data-part` appends the boundary index,
 * which is how one registration covers every boundary (handleTableRowBoundary
 * reads it back).
 *
 * The inner rules alone get a strip. The table's top and bottom edges are its own
 * silhouette, not a boundary between two rows.
 *
 * The edges come from the layout rather than from the state's box so the strips
 * sit on the rules even on the render before the content resizer has written the
 * derived size back — the same reason the drawing reads it (TableBox).
 */
const TableRowBoundaryControlComponent: React.FC<
	SelectionControlProps<TableState>
> = ({ object, zoom, part }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnXs, rowYs } = calcTableLayout(object);
	const radians = degreesToRadians(rotation);
	const left = columnXs[0];
	const right = columnXs[columnXs.length - 1];

	return (
		<>
			{rowYs.slice(1, -1).map((y, boundaryIndex) => (
				<TableBoundaryStrip
					key={`row-${boundaryIndex}`}
					from={calcAffineTransformedPoint(
						left,
						y,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					to={calcAffineTransformedPoint(
						right,
						y,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					zoom={zoom}
					objectId={id}
					part={`${part}:${boundaryIndex}`}
					cursor={getResizeCursorForRotation(90, rotation, scaleX, scaleY)}
				/>
			))}
		</>
	);
};

export const TableRowBoundaryControl = memo(TableRowBoundaryControlComponent);
