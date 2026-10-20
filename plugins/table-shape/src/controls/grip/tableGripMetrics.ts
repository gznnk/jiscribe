import { darkCanvasTheme } from "@jiscribe/canvas";
import { SELECTION_OUTLINE_WIDTH } from "@jiscribe/canvas-sdk";

/**
 * How thick a grip is drawn, in world units, so it grows and shrinks with the
 * table it heads at any zoom: the height of a column's heading and
 * the width of a row's. Enough to carry a three-digit row number upright
 * (GRIP_LABEL_FONT_SIZE in TableTrackGrip) and still read as a margin beside the table rather than
 * as another row of it. Equal to the margin the canvas keeps around a picked
 * cell it scrolls into view, so at 100% the view stops right at the grips' edge.
 */
export const GRIP_THICKNESS = 24;

/**
 * Distance from the table's edge to the grip's centre line, in world units. The
 * grips abut the table the way a spreadsheet's headings do: half the thickness,
 * plus half the border the cell is stroked with (TableTrackGrip), so the border
 * stops at the table's box rather than running into it.
 */
export const GRIP_OFFSET = GRIP_THICKNESS / 2 + SELECTION_OUTLINE_WIDTH / 2;

/**
 * Distance from the table's edge to the grips' outer side, in world units: how
 * far out of the table the headings reach, and the side of the corner grip's
 * square, which runs from there up to the edge to meet the grips' ends.
 */
export const GRIP_REACH = GRIP_OFFSET + GRIP_THICKNESS / 2;

/**
 * Radius of the canvas's connection-anchor dots, in screen px, read off the
 * built-in theme because a connection-anchors calculator is pure and is not
 * handed the host's; a host theme with a larger radius narrows the clearance
 * below.
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
	GRIP_REACH * zoom +
	CONNECTION_ANCHOR_RADIUS +
	CONNECTION_ANCHOR_CONTROL_CLEARANCE;
