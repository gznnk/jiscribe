import type { ObjectPartSelection } from "@jiscribe/canvas";
import { collectObjectPartIds } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { INSERT_BADGE_RADIUS } from "./TableInsertBadge";
import { GRIP_OFFSET, TableTrackGrip } from "./TableTrackGrip";
import { parseTableTrackPartId, tableTrackPartId } from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import { TABLE_TRACK_PART_DEFINITIONS } from "../parts/tableTrackParts";
import type { TableState } from "../state/TableState";

/**
 * Clearance between a grip's end and the edge of the insert badge on the
 * boundary next to it, in screen px.
 */
const GRIP_BADGE_CLEARANCE = 3;

/**
 * How far each end of a grip stops short of its boundary, in screen px: room for
 * the badge standing on that boundary plus the clearance. Capped at a quarter of
 * the track on a track too short to spend it, where the grip then runs under the
 * badge's edge rather than vanishing.
 */
const GRIP_END_INSET = INSERT_BADGE_RADIUS + GRIP_BADGE_CLEARANCE;

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
 * One grip per track, laid just outside the table's leading edge: rows down the
 * left, columns across the top. Each stops short of both its boundaries, leaving
 * the gaps the insert badges stand in on the same centre line (TableInsertBadges). Shared by both axes because the two differ only
 * in which layout edges run along the bar and which stay fixed.
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
	// The coordinate the whole strip of grips sits at: clear of the edge the
	// tracks start from, on the outside.
	const lead =
		(axis === "row" ? columnEdgeXs[0] : rowEdgeYs[0]) - GRIP_OFFSET / zoom;
	const toWorld = (along: number): Point =>
		axis === "row"
			? calcAffineTransformedPoint(lead, along, scaleX, scaleY, radians, cx, cy)
			: calcAffineTransformedPoint(
					along,
					lead,
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
				const inset = Math.min(GRIP_END_INSET / zoom, (end - start) / 4);
				return (
					<TableTrackGrip
						key={`${axis}-${index}`}
						from={toWorld(start + inset)}
						to={toWorld(end - inset)}
						zoom={zoom}
						objectId={id}
						action={`${action}:${tableTrackPartId(index)}`}
						selected={selectedIndices.has(index)}
					/>
				);
			})}
		</>
	);
};

export const TableTrackGrips = memo(TableTrackGripsComponent);
