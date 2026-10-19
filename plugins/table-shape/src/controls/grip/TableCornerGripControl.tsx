import type { SelectionControlProps } from "@jiscribe/canvas";
import {
	canvasThemeCssVars as theme,
	SELECTION_OUTLINE_WIDTH,
} from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import { GRIP_OFFSET, GRIP_THICKNESS } from "./tableGripMetrics";
import { readCachedTableLayout } from "../../layout/readCachedTableLayout";
import type { TableState } from "../../state/TableState";
import { calcSegmentPlacement } from "../shared/calcSegmentPlacement";

/**
 * The grip in the corner where the row and column headings meet, as a
 * spreadsheet's select-all corner: clicking it picks every cell
 * (handleTableCornerGrip). An empty heading cell the grips' thickness square,
 * placed from the layout in the table's local coordinates like the grips
 * (TableTrackGrips), so it follows a rotated or flipped table.
 *
 * Never drawn selected: what it picks is the cells, and their outlines already
 * show it. Its border is closed on all four sides; the two it shares with the
 * first row's and the first column's grips fall on their borders.
 */
const TableCornerGripControlComponent: React.FC<
	SelectionControlProps<TableState>
> = ({ object, action }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnEdgeXs, rowEdgeYs } = readCachedTableLayout(object);
	const radians = degreesToRadians(rotation);
	const centreX = columnEdgeXs[0] - GRIP_OFFSET;
	const centreY = rowEdgeYs[0] - GRIP_OFFSET;
	const { transform, length } = calcSegmentPlacement(
		calcAffineTransformedPoint(
			centreX - GRIP_THICKNESS / 2,
			centreY,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		calcAffineTransformedPoint(
			centreX + GRIP_THICKNESS / 2,
			centreY,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
	const thickness = GRIP_THICKNESS;

	return (
		<g transform={transform}>
			<rect
				x={-length / 2}
				y={-thickness / 2}
				width={length}
				height={thickness}
				strokeWidth={SELECTION_OUTLINE_WIDTH}
				style={{
					fill: theme.surface,
					stroke: theme.borderSubtle,
					pointerEvents: "none",
				}}
			/>
			<rect
				x={-length / 2}
				y={-thickness / 2}
				width={length}
				height={thickness}
				data-kind="control"
				data-id={id}
				data-action={action}
				style={{ fill: "none", pointerEvents: "all", cursor: "pointer" }}
			/>
		</g>
	);
};

export const TableCornerGripControl = memo(TableCornerGripControlComponent);
