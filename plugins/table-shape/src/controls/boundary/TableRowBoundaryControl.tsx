import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import { readCachedTableLayout } from "../../layout/readCachedTableLayout";
import type { TableState } from "../../state/TableState";
import { TableBoundaryStrip } from "../shared/TableBoundaryStrip";

/**
 * Handles for the boundaries between rows: one strip per horizontal rule,
 * running the full width of the table. The strip's `data-action` appends the
 * boundary index, which is how one registration covers every boundary
 * (handleTableRowBoundary reads it back).
 *
 * The inner rules alone get a strip. The table's top and bottom edges are its own
 * silhouette, not a boundary between two rows; the trailing one is
 * TableTrailingEdgeControl's.
 *
 * The edges come from the layout rather than from the state's box so the strips
 * sit on the rules even on the render before the content resizer has written the
 * derived size back — the same reason the drawing reads it (Table).
 */
const TableRowBoundaryControlComponent: React.FC<
	SelectionControlProps<TableState>
> = ({ object, zoom, action }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnEdgeXs, rowEdgeYs } = readCachedTableLayout(object);
	const radians = degreesToRadians(rotation);
	const left = columnEdgeXs[0];
	const right = columnEdgeXs[columnEdgeXs.length - 1];

	return (
		<>
			{rowEdgeYs.slice(1, -1).map((y, boundaryIndex) => (
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
					action={`${action}:${boundaryIndex}`}
					cursor={getResizeCursorForRotation(90, rotation, scaleX, scaleY)}
				/>
			))}
		</>
	);
};

export const TableRowBoundaryControl = memo(TableRowBoundaryControlComponent);
