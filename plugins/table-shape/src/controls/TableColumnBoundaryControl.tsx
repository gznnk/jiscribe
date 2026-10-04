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
 * Handles for the boundaries between columns: one strip per vertical rule,
 * running the full height of the table. The strip's `data-part` appends the
 * boundary index, which is how one registration covers every boundary
 * (handleTableColumnBoundary reads it back).
 *
 * The inner rules alone get a strip. The table's left and right edges are its own
 * silhouette, not a boundary between two columns, and resizing there is the
 * transform frame's business.
 *
 * The edges come from the layout rather than from the state's box so the strips
 * sit on the rules even on the render before the content resizer has written the
 * derived size back — the same reason the drawing reads it (TableBox).
 */
const TableColumnBoundaryControlComponent: React.FC<
	SelectionControlProps<TableState>
> = ({ object, zoom, part }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnXs, rowYs } = calcTableLayout(object);
	const radians = degreesToRadians(rotation);
	const top = rowYs[0];
	const bottom = rowYs[rowYs.length - 1];

	return (
		<>
			{columnXs.slice(1, -1).map((x, boundaryIndex) => (
				<TableBoundaryStrip
					key={`column-${boundaryIndex}`}
					from={calcAffineTransformedPoint(
						x,
						top,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					to={calcAffineTransformedPoint(
						x,
						bottom,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					zoom={zoom}
					objectId={id}
					part={`${part}:${boundaryIndex}`}
					cursor={getResizeCursorForRotation(0, rotation, scaleX, scaleY)}
				/>
			))}
		</>
	);
};

export const TableColumnBoundaryControl = memo(
	TableColumnBoundaryControlComponent,
);
