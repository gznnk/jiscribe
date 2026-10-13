import { darkCanvasTheme } from "@jiscribe/canvas";
import {
	canvasThemeCssVars as theme,
	useCanvasTheme,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { calcSegmentPlacement } from "./calcSegmentPlacement";
import { INSERT_BADGE_OFFSET, INSERT_BADGE_RADIUS } from "./TableInsertBadge";

/**
 * How thick a grip is drawn, in screen px: the height of a column's heading and
 * the width of a row's. Enough to carry a three-digit row number upright
 * (GRIP_LABEL_FONT_SIZE) and still read as a margin beside the table rather than
 * as another row of it.
 */
export const GRIP_THICKNESS = 18;

/** Size of the heading's text, in screen px. */
const GRIP_LABEL_FONT_SIZE = 10;

/** The heading's face: the canvas's own UI sans, not the document's text font, a heading being chrome rather than content. */
const GRIP_LABEL_FONT_FAMILY = "Arial, Helvetica, sans-serif";

/**
 * Distance from the table's edge to the grip's centre line, in screen px. The
 * grips abut the table the way a spreadsheet's headings do, so it is half the
 * thickness and nothing more.
 */
export const GRIP_OFFSET = GRIP_THICKNESS / 2;

/**
 * Radius of the canvas's connection-anchor dots, in screen px, read off the
 * built-in theme because an offset calculator is pure and is not handed the
 * host's; a host theme with a larger radius narrows the clearance below.
 */
const CONNECTION_ANCHOR_RADIUS = darkCanvasTheme.handleDimensions.anchorRadius;

/** Clearance between a control's outer side and a connection-anchor dot's edge, in screen px. */
const CONNECTION_ANCHOR_CONTROL_CLEARANCE = 10;

/**
 * Distance from the table's edge to a connection-anchor dot's centre, in screen
 * px, on every edge: the grips line the top and left, the insert badges the
 * bottom and right, and the one distance clears whichever of the two reaches
 * further.
 */
export const CONNECTION_ANCHOR_OFFSET_PAST_CONTROLS =
	Math.max(GRIP_THICKNESS, INSERT_BADGE_OFFSET + INSERT_BADGE_RADIUS) +
	CONNECTION_ANCHOR_RADIUS +
	CONNECTION_ANCHOR_CONTROL_CLEARANCE;

type TableTrackGripProps = {
	/** The grip's centre line's start, in world coordinates; already offset clear of the table's edge. */
	from: Point;
	/** Its end, in world coordinates; swapping the two only turns the grip end for end. */
	to: Point;
	/**
	 * The point on the table's edge the grip's middle faces, in world
	 * coordinates: which side of the centre line the table is on, read off the
	 * drawing rather than assumed, so a flipped or rotated table still gets it
	 * right.
	 */
	edgeMid: Point;
	/**
	 * Whether a transform handle sits on the edge this grip abuts. The grip then
	 * keeps its pressable region off the handle's reach beyond the edge, the
	 * drawn cell still running up to the edge; a false leaves the whole cell
	 * pressable.
	 */
	clearsEdgeHandle: boolean;
	/** Canvas zoom, which the thickness and the text are divided by so the grip stays the same size on screen at any zoom. */
	zoom: number;
	/** The table the grip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, track index included, which is what routes the click to a track. */
	action: string;
	/** The heading drawn on the grip: the row's number or the column's letters (formatTableTrackLabel). */
	label: string;
	/** Whether this track is the selected part; fills the cell with the accent and inverts the label so it stays legible, the border staying as it is. */
	selected: boolean;
};

/**
 * One row's or one column's grip: a heading cell laid against the track it
 * stands for, abutting the table's edge, lettered or numbered as a spreadsheet
 * heads its columns and rows. Clicking it selects that whole track
 * (createTableTrackGripHandler), which is a different selection from the track's
 * cells and is what makes Delete mean "remove this row".
 *
 * The cell follows the table's transform; the label is drawn upright whatever
 * the rotation, for the same reason the insert badge is (TableInsertBadge): a
 * heading is read as a heading rather than as part of the drawing.
 *
 * The drawn cell and the pressable region are two elements. The width handles
 * sit on the left and right edges at the table's mid-height, and the selection
 * controls are drawn after the transform ones (SelectionControlsLayer), so a
 * cell abutting that edge would take the press meant for the handle. The cell
 * itself takes no pointer; an unpainted rect on top carries the control data
 * attributes the gesture layer routes on (`data-kind="control"` + the table's id
 * + the action naming the track) and, where a handle shares the edge, stops
 * short of its reach. The label takes no pointer either, so no press resolves to
 * it instead of the control.
 */
const TableTrackGripComponent: React.FC<TableTrackGripProps> = ({
	from,
	to,
	edgeMid,
	clearsEdgeHandle,
	zoom,
	objectId,
	action,
	label,
	selected,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const { transform, length } = calcSegmentPlacement(from, to);
	const thickness = GRIP_THICKNESS / zoom;
	const fill = selected ? theme.handleAccent : theme.handleFill;
	const ink = selected ? theme.handleFill : theme.handleAccent;
	const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

	// The placed group's +y axis is the centre line turned a quarter turn
	// clockwise on screen; the table lies on that side when its edge does.
	const tableOnPositiveSide =
		-(to.y - from.y) * (edgeMid.x - mid.x) +
			(to.x - from.x) * (edgeMid.y - mid.y) >
		0;
	const handleReach = clearsEdgeHandle
		? (handleDimensions.anchorRadius + handleDimensions.anchorStrokeWidth) /
			zoom
		: 0;
	const hitThickness = thickness - handleReach;
	const hitY = tableOnPositiveSide
		? -thickness / 2
		: -thickness / 2 + handleReach;

	return (
		<>
			<g transform={transform}>
				<rect
					x={-length / 2}
					y={-thickness / 2}
					width={length}
					height={thickness}
					strokeWidth={handleDimensions.anchorStrokeWidth / zoom}
					style={{ fill, stroke: theme.handleAccent, pointerEvents: "none" }}
				/>
			</g>
			<text
				x={mid.x}
				y={mid.y}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={GRIP_LABEL_FONT_SIZE / zoom}
				fontFamily={GRIP_LABEL_FONT_FAMILY}
				style={{ fill: ink, pointerEvents: "none", userSelect: "none" }}
			>
				{label}
			</text>
			<g transform={transform}>
				<rect
					x={-length / 2}
					y={hitY}
					width={length}
					height={hitThickness}
					data-kind="control"
					data-id={objectId}
					data-action={action}
					style={{ fill: "none", pointerEvents: "all", cursor: "pointer" }}
				/>
			</g>
		</>
	);
};

export const TableTrackGrip = memo(TableTrackGripComponent);
