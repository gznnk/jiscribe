import { darkCanvasTheme } from "@jiscribe/canvas";
import {
	canvasThemeCssVars as theme,
	SELECTION_OUTLINE_WIDTH,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { calcSegmentPlacement } from "./calcSegmentPlacement";

/**
 * How thick a grip is drawn, in world units, so it grows and shrinks with the
 * table it heads at any zoom: the height of a column's heading and
 * the width of a row's. Enough to carry a three-digit row number upright
 * (GRIP_LABEL_FONT_SIZE) and still read as a margin beside the table rather than
 * as another row of it. Equal to the margin the canvas keeps around a picked
 * cell it scrolls into view, so at 100% the view stops right at the grips' edge.
 */
export const GRIP_THICKNESS = 24;

/**
 * A selected grip's face: the accent faded into the surface. The full accent
 * filling a whole row of headings is louder than the selection it stands for.
 */
const SELECTED_GRIP_FILL = `color-mix(in srgb, ${theme.handleAccent} 18%, ${theme.surface})`;

/** Size of the heading's text, in world units like the grip it sits on. */
const GRIP_LABEL_FONT_SIZE = 10;

/** The heading's face: the canvas's own UI sans, not the document's text font, a heading being chrome rather than content. */
const GRIP_LABEL_FONT_FAMILY = "Arial, Helvetica, sans-serif";

/**
 * Distance from the table's edge to the grip's centre line, in world units. The
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

/** Clearance between a grip's outer side and a connection-anchor dot's edge, in screen px. */
const CONNECTION_ANCHOR_CONTROL_CLEARANCE = 10;

/**
 * Distance from the table's edge to the connection-anchor dot on an edge the
 * grips line (top and left), in screen px. The grips are sized in world units,
 * so how far they reach on screen is read at the zoom asked about.
 *
 * @param zoom - Canvas zoom (1 = 100%)
 * @returns The distance for the top and left dots
 */
export const calcConnectionAnchorOffsetPastGrips = (zoom: number): number =>
	GRIP_THICKNESS * zoom +
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
	/** The table the grip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, track index included, which is what routes the click to a track. */
	action: string;
	/** The heading drawn on the grip: the row's number or the column's letters (formatTableTrackLabel). */
	label: string;
	/** Whether this track is among the selected parts; tints the cell with the accent and inks the label in it, the border staying as it is. */
	selected: boolean;
};

/**
 * One row's or one column's grip: a heading cell laid against the track it
 * stands for, abutting the table's edge, lettered or numbered as a spreadsheet
 * heads its columns and rows. Clicking it selects that whole track, and Shift or
 * Ctrl / Meta grow or trim a pick of several (createTableTrackGripHandler); a
 * different selection from the tracks' cells, and what makes Delete mean
 * "remove these rows".
 *
 * The cell follows the table's transform; the label is drawn upright whatever
 * the rotation: a heading is read as a heading rather than as part of the
 * drawing, and tilted text would only be harder to read.
 *
 * The drawn cell and the pressable region are separate elements. The cell itself
 * takes no pointer; an unpainted rect on top, covering the whole cell, carries
 * the control data attributes the gesture layer routes on (`data-kind="control"`
 * + the table's id + the action naming the track). The label takes no pointer
 * either, so no press resolves to it instead of the control. Where the resize
 * handle at the middle of the left or top edge overlaps the cell, the handle
 * takes the press, the grips being drawn under the core handles (the table's
 * `selectionControls`).
 */
const TableTrackGripComponent: React.FC<TableTrackGripProps> = ({
	from,
	to,
	edgeMid,
	objectId,
	action,
	label,
	selected,
}) => {
	const { transform, length } = calcSegmentPlacement(from, to);
	const thickness = GRIP_THICKNESS;
	const fill = selected ? SELECTED_GRIP_FILL : theme.surface;
	const ink = selected ? theme.handleAccent : theme.foregroundMuted;
	const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

	// The placed group's +y axis is the centre line turned a quarter turn
	// clockwise on screen; the table lies on that side when its edge does.
	const tableOnPositiveSide =
		-(to.y - from.y) * (edgeMid.x - mid.x) +
			(to.x - from.x) * (edgeMid.y - mid.y) >
		0;
	// The border leaves out the side against the table, where it would be
	// drawn over the selection outline.
	const tableSideY = tableOnPositiveSide ? thickness / 2 : -thickness / 2;
	const borderPath = `M ${-length / 2} ${tableSideY} V ${-tableSideY} H ${length / 2} V ${tableSideY}`;

	return (
		<>
			<g transform={transform}>
				<rect
					x={-length / 2}
					y={-thickness / 2}
					width={length}
					height={thickness}
					style={{ fill, pointerEvents: "none" }}
				/>
				<path
					d={borderPath}
					fill="none"
					// World units, not divided by the zoom: the selection outline it
					// abuts scales with the content, and the two read as one line weight.
					strokeWidth={SELECTION_OUTLINE_WIDTH}
					style={{ stroke: theme.borderSubtle, pointerEvents: "none" }}
				/>
			</g>
			<text
				x={mid.x}
				y={mid.y}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={GRIP_LABEL_FONT_SIZE}
				fontFamily={GRIP_LABEL_FONT_FAMILY}
				style={{ fill: ink, pointerEvents: "none", userSelect: "none" }}
			>
				{label}
			</text>
			<g transform={transform}>
				<rect
					x={-length / 2}
					y={-thickness / 2}
					width={length}
					height={thickness}
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
