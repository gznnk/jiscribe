import { collectObjectPartIds } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import { useObjectPartKindRegistry } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { GRIP_OFFSET, TableTrackGrip } from "./TableTrackGrip";
import { tableTrackPartId } from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { calcTableLayout } from "../layout/calcTableLayout";
import type { TableState } from "../state/TableState";

/**
 * Gap left at each end of a grip, in screen px, so neighbours read as one bar per
 * track rather than as an unbroken rail. Capped at a quarter of the track on a
 * track too short to spend it.
 */
const GRIP_END_INSET = 1;

type TableTrackGripsProps = {
	/** The table the grips stand beside; its transform and layout are what they are placed from. */
	object: TableState;
	/** Canvas zoom, which every screen-px measurement here is divided by. */
	zoom: number;
	/** The control's `data-part`; each grip appends its own track index to it. */
	part: string;
	/** The part selection standing on this table, or null; a grip draws itself selected only for its own kind. */
	selectedParts: ObjectPartSelection | null;
	/** Which tracks to draw grips for — also the part kind a click on one writes. */
	axis: TableAxis;
};

/**
 * One grip per track, laid just outside the table's leading edge: rows down the
 * left, columns across the top. Shared by both axes because the two differ only
 * in which layout edges run along the bar and which stay fixed.
 *
 * The grips are placed from the layout rather than from the state's box, so they
 * stand beside the drawn grid even on the render before the content resizer has
 * written the derived size back (the same reason the drawing reads it, TableBox).
 * The outward offset is taken in the table's local coordinates before the
 * transform, which puts the grips outside a rotated or flipped table too.
 */
const TableTrackGripsComponent: React.FC<TableTrackGripsProps> = ({
	object,
	zoom,
	part,
	selectedParts,
	axis,
}) => {
	const objectPartKind = useObjectPartKindRegistry();
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnXs, rowYs } = calcTableLayout(object);
	const radians = degreesToRadians(rotation);

	// The selection stores the ends of its ranges, so a grip asks the kind whether
	// its own track falls inside one of them.
	const trackPart =
		selectedParts?.kind === axis
			? objectPartKind.get(object.type, axis)
			: undefined;
	const selectedTrackIds =
		selectedParts && trackPart
			? collectObjectPartIds(selectedParts, trackPart, object)
			: [];

	const edges = axis === "row" ? rowYs : columnXs;
	// The coordinate the whole strip of grips sits at: clear of the edge the
	// tracks start from, on the outside.
	const lead = (axis === "row" ? columnXs[0] : rowYs[0]) - GRIP_OFFSET / zoom;
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
						part={`${part}:${tableTrackPartId(index)}`}
						selected={selectedTrackIds.includes(tableTrackPartId(index))}
					/>
				);
			})}
		</>
	);
};

export const TableTrackGrips = memo(TableTrackGripsComponent);
