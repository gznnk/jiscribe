import type { ObjectPartSelection } from "@jiscribe/canvas";
import { collectObjectPartIds } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { formatTableTrackLabel } from "./formatTableTrackLabel";
import { GRIP_OFFSET, TableTrackGrip } from "./TableTrackGrip";
import { parseTableTrackPartId, tableTrackPartId } from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import { TABLE_TRACK_PART_DEFINITIONS } from "../parts/tableTrackParts";
import type { TableState } from "../state/TableState";

type TableTrackGripsProps = {
	/** The table the grips stand beside; its transform and layout are what they are placed from. */
	object: TableState;
	/** Canvas zoom, which every screen-px measurement here is divided by. */
	zoom: number;
	/** The control's `data-action`; each grip appends its own track index to it. */
	action: string;
	/** The part selection standing on this table, or null; a grip draws itself selected only for its own kind. */
	selectedPart: ObjectPartSelection | null;
	/** Which tracks to draw grips for — also the part kind a click on one writes. */
	axis: TableAxis;
};

/**
 * One grip per track, laid against the table's leading edge like a
 * spreadsheet's headings: rows numbered down the left, columns lettered across
 * the top. Each runs the full length of its track, so neighbours abut as the
 * headings of a sheet do and only their borders part them; the insert badges
 * stand on the opposite edge (TableInsertBadges). Shared by both axes because the two differ
 * only in which layout edges run along the bar and which stay fixed.
 *
 * The grips are placed from the layout rather than from the state's box, so they
 * stand beside the drawn grid even on the render before the content resizer has
 * written the derived size back (the same reason the drawing reads it, Table).
 * The outward offset is taken in the table's local coordinates before the
 * transform, which puts the grips outside a rotated or flipped table too.
 */
const TableTrackGripsComponent: React.FC<TableTrackGripsProps> = ({
	object,
	zoom,
	action,
	selectedPart,
	axis,
}) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnEdgeXs, rowEdgeYs } = readCachedTableLayout(object);
	const radians = degreesToRadians(rotation);

	// The selection stores the ends of its ranges; the axis's own definition is
	// what expands them, as it does for every other reader of the pick.
	const selectedIndices = new Set(
		selectedPart?.kind === axis
			? collectObjectPartIds(
					selectedPart,
					TABLE_TRACK_PART_DEFINITIONS[axis],
					object,
				).map(parseTableTrackPartId)
			: [],
	);

	const edges = axis === "row" ? rowEdgeYs : columnEdgeXs;
	// The edge the tracks start from, and the coordinate the whole strip of
	// grips is centred on: just outside it.
	const edge = axis === "row" ? columnEdgeXs[0] : rowEdgeYs[0];
	const lead = edge - GRIP_OFFSET / zoom;
	const toWorld = (across: number, along: number): Point =>
		axis === "row"
			? calcAffineTransformedPoint(
					across,
					along,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				)
			: calcAffineTransformedPoint(
					along,
					across,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				);

	return (
		<>
			{edges.slice(0, -1).map((start, index) => {
				const end = edges[index + 1];
				return (
					<TableTrackGrip
						key={`${axis}-${index}`}
						from={toWorld(lead, start)}
						to={toWorld(lead, end)}
						edgeMid={toWorld(edge, (start + end) / 2)}
						// The width handles sit on the left and right edges
						// (TABLE_TRANSFORM_HANDLES), which only the rows' strip shares.
						clearsEdgeHandle={axis === "row"}
						zoom={zoom}
						objectId={id}
						action={`${action}:${tableTrackPartId(index)}`}
						label={formatTableTrackLabel(axis, index)}
						selected={selectedIndices.has(index)}
					/>
				);
			})}
		</>
	);
};

export const TableTrackGrips = memo(TableTrackGripsComponent);
