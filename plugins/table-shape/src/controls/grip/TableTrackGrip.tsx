import {
	canvasThemeCssVars as theme,
	SELECTION_OUTLINE_WIDTH,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { GRIP_THICKNESS } from "./tableGripMetrics";
import { TableGripHitArea, TableGripLabel } from "./TableGripStyled";
import { calcSegmentPlacement } from "../shared/calcSegmentPlacement";

/**
 * A selected grip's face: the accent faded into the surface. The full accent
 * filling a whole row of headings is louder than the selection it stands for.
 */
const SELECTED_GRIP_FILL = `color-mix(in srgb, ${theme.handleAccent} 18%, ${theme.surface})`;

/** Size of the heading's text, in world units like the grip it sits on. */
const GRIP_LABEL_FONT_SIZE = 10;

/** The heading's face: the canvas's own UI sans, not the document's text font, a heading being chrome rather than content. */
const GRIP_LABEL_FONT_FAMILY = "Arial, Helvetica, sans-serif";

type TableTrackGripProps = {
	/** The grip's centre line's start, in world coordinates; already offset clear of the table's edge. */
	from: Point;
	/** Its end, in world coordinates; swapping the two only turns the grip end for end. */
	to: Point;
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
 * either, so no press resolves to it instead of the control. The grips are
 * drawn under the selection outline (the table's `selectionControls`), which
 * runs over the cell's side against the table, and under the core handles; so
 * the resize handle at the middle of the left or top edge takes the press where
 * it overlaps the cell.
 */
const TableTrackGripComponent: React.FC<TableTrackGripProps> = ({
	from,
	to,
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

	return (
		<>
			<g transform={transform}>
				<rect
					x={-length / 2}
					y={-thickness / 2}
					width={length}
					height={thickness}
					// World units, not divided by the zoom: the selection outline it
					// abuts scales with the content, and the two read as one line weight.
					strokeWidth={SELECTION_OUTLINE_WIDTH}
					pointerEvents="none"
					style={{ fill, stroke: theme.borderSubtle }}
				/>
			</g>
			<TableGripLabel
				x={mid.x}
				y={mid.y}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={GRIP_LABEL_FONT_SIZE}
				fontFamily={GRIP_LABEL_FONT_FAMILY}
				style={{ fill: ink }}
			>
				{label}
			</TableGripLabel>
			<g transform={transform}>
				<TableGripHitArea
					x={-length / 2}
					y={-thickness / 2}
					width={length}
					height={thickness}
					data-kind="control"
					data-id={objectId}
					data-action={action}
				/>
			</g>
		</>
	);
};

export const TableTrackGrip = memo(TableTrackGripComponent);
