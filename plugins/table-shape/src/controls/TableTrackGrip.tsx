import {
	canvasThemeCssVars as theme,
	useCanvasTheme,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { calcTableStripPlacement } from "./calcTableStripPlacement";

/**
 * How thick a grip is drawn, in screen px. Thin enough to read as a margin
 * ornament beside the table rather than as another row of it, wide enough to hit
 * without aiming.
 */
export const GRIP_THICKNESS = 9;

/**
 * Gap between the table's edge and the near side of the grip, in screen px. Wider
 * than the transform frame's anchor radius (4), because the width handles sit on
 * the left and right edges at the table's mid-height and the selection controls
 * are drawn after the transform ones (SelectionControlsLayer) — a grip reaching
 * that far would take the press meant for a handle.
 */
export const GRIP_GAP = 7;

/** Distance from the table's edge to the grip's centre line, in screen px. */
export const GRIP_OFFSET = GRIP_GAP + GRIP_THICKNESS / 2;

type TableTrackGripProps = {
	/** The grip's centre line's start, in world coordinates; already offset clear of the table's edge. */
	from: Point;
	/** Its end, in world coordinates; swapping the two only turns the grip end for end. */
	to: Point;
	/** Canvas zoom, which the thickness is divided by so the grip stays the same size on screen at any zoom. */
	zoom: number;
	/** The table the grip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-part`, track index included, which is what routes the click to a track. */
	part: string;
	/** Whether this track is the selected part; inverts the fill/stroke pair the way a selected handle reads. */
	selected: boolean;
};

/**
 * One row's or one column's grip: a bar laid alongside the track it stands for,
 * just outside the table. Clicking it selects that whole track
 * (createTableTrackGripHandler), which is a different selection from the track's
 * cells and is what makes Delete mean "remove this row".
 *
 * Carries the control data attributes the gesture layer routes on
 * (`data-kind="control"` + the table's id + the part naming the track).
 */
const TableTrackGripComponent: React.FC<TableTrackGripProps> = ({
	from,
	to,
	zoom,
	objectId,
	part,
	selected,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const { transform, length } = calcTableStripPlacement(from, to);
	const thickness = GRIP_THICKNESS / zoom;

	return (
		<g transform={transform}>
			<rect
				x={-length / 2}
				y={-thickness / 2}
				width={length}
				height={thickness}
				rx={thickness / 2}
				strokeWidth={handleDimensions.anchorStrokeWidth / zoom}
				data-kind="control"
				data-id={objectId}
				data-part={part}
				style={{
					fill: selected ? theme.handleAccent : theme.handleFill,
					stroke: selected ? theme.handleFill : theme.handleAccent,
					cursor: "pointer",
				}}
			/>
		</g>
	);
};

export const TableTrackGrip = memo(TableTrackGripComponent);
