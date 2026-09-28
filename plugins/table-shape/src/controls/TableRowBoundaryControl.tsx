import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import { BOUNDARY_HIT_WIDTH, TableBoundaryStrip } from "./TableBoundaryStrip";
import { calcTableLayout } from "../layout/calcTableLayout";
import type { TableState } from "../state/TableState";

/**
 * How far a strip stops short of the table's left and right edges, in local px.
 * The transform frame's two width handles sit on those edges at the table's
 * mid-height — which is exactly where a two-row table's only boundary runs — and
 * the selection controls are drawn after the transform ones
 * (SelectionControlsLayer), so a strip reaching the edge takes the press meant
 * for a handle. Never more than a quarter of the rule, so a narrow table keeps a
 * strip to grab.
 *
 * @param ruleLength - Width of the table in local px, the rule spanning all of it
 * @param zoom - Canvas zoom, which the screen-px clearance is divided by
 */
const calcHandleClearance = (ruleLength: number, zoom: number): number =>
	Math.min(BOUNDARY_HIT_WIDTH / zoom, ruleLength / 4);

/**
 * Handles for the boundaries between rows: one strip per horizontal rule, running
 * the width of the table bar the clearance its ends keep from the width handles
 * ({@link calcHandleClearance}). The strip's `data-part` appends the boundary
 * index, which is how one registration covers every boundary
 * (handleTableRowBoundary reads it back).
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
	const clearance = calcHandleClearance(
		columnXs[columnXs.length - 1] - columnXs[0],
		zoom,
	);
	const left = columnXs[0] + clearance;
	const right = columnXs[columnXs.length - 1] - clearance;

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
