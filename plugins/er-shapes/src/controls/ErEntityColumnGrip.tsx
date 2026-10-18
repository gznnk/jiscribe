import { darkCanvasTheme } from "@jiscribe/canvas";
import {
	canvasThemeCssVars as theme,
	SELECTED_HANDLE_STROKE_SCALE,
	useCanvasTheme,
} from "@jiscribe/canvas-sdk";
import type { Rect } from "@jiscribe/geometry";
import { memo } from "react";

/**
 * How wide a grip's pill is, in the entity's local units, so it grows and
 * shrinks with the entity at any zoom.
 */
export const ER_ENTITY_COLUMN_GRIP_WIDTH = 7;

/** Gap between the entity's left edge and a grip's pill, in local units. */
export const ER_ENTITY_COLUMN_GRIP_GAP = 3;

/** How far a grip's pill stops short of its row's top and bottom, in local units. */
export const ER_ENTITY_COLUMN_GRIP_INSET = 3;

/**
 * Radius of the canvas's connection-anchor dots, in screen px, read off the
 * built-in theme because an offset calculator is pure and is not handed the
 * host's; a host theme with a larger radius narrows the clearance below.
 */
const CONNECTION_ANCHOR_RADIUS = darkCanvasTheme.handleDimensions.anchorRadius;

/** Clearance between a grip's outer side and a connection-anchor dot's edge, in screen px. */
const CONNECTION_ANCHOR_CONTROL_CLEARANCE = 10;

/**
 * Distance from the entity's left edge to a connection-anchor dot on that edge,
 * in screen px: past the grips, which are sized in local units and so reach
 * further on screen the further the canvas is zoomed in.
 *
 * @param zoom - Canvas zoom (1 = 100%)
 * @returns The distance for the left-edge dots (`leftCenter` and every `col:<i>:left`)
 */
export const calcConnectionAnchorOffsetPastGrips = (zoom: number): number =>
	(ER_ENTITY_COLUMN_GRIP_GAP + ER_ENTITY_COLUMN_GRIP_WIDTH) * zoom +
	CONNECTION_ANCHOR_RADIUS +
	CONNECTION_ANCHOR_CONTROL_CLEARANCE;

type ErEntityColumnGripProps = {
	/** The column's row band, in the entity's local coordinates; the grip stands outside its left edge. */
	band: Rect;
	/** Canvas zoom, which the stroke width is divided by so the outline stays the same on screen. */
	zoom: number;
	/** The entity the grip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, column part id included, which is what routes the click to a column. */
	action: string;
	/** Whether this column is among the picked parts; swaps the pill's fill and stroke. */
	selected: boolean;
};

/**
 * One column's grip, a pill drawn in the entity's local coordinates (the caller
 * wraps the grips in the entity's transform, so a rotated or flipped entity
 * carries them with it). Clicking it picks the whole column, and Shift or
 * Ctrl / Meta grows the pick to several (handleErEntityColumnGrip); Delete
 * removes the picked columns and Enter opens the active one's name.
 *
 * The pill takes no pointer; an unpainted rect on top, spanning the row's height
 * and the gap as well as the pill, carries the control data attributes the
 * gesture layer routes on. Where the left width handle overlaps a grip, the
 * handle takes the press, the grips being drawn under the core handles.
 */
const ErEntityColumnGripComponent: React.FC<ErEntityColumnGripProps> = ({
	band,
	zoom,
	objectId,
	action,
	selected,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const hitWidth = ER_ENTITY_COLUMN_GRIP_WIDTH + ER_ENTITY_COLUMN_GRIP_GAP;
	const hitLeft = band.x - hitWidth;
	const pillHeight = Math.max(0, band.height - 2 * ER_ENTITY_COLUMN_GRIP_INSET);
	const strokeWidth =
		(handleDimensions.anchorStrokeWidth *
			(selected ? SELECTED_HANDLE_STROKE_SCALE : 1)) /
		zoom;

	return (
		<>
			<rect
				x={hitLeft}
				y={band.y + ER_ENTITY_COLUMN_GRIP_INSET}
				width={ER_ENTITY_COLUMN_GRIP_WIDTH}
				height={pillHeight}
				rx={ER_ENTITY_COLUMN_GRIP_WIDTH / 2}
				strokeWidth={strokeWidth}
				style={{
					fill: selected ? theme.handleAccent : theme.handleFill,
					stroke: selected ? theme.handleFill : theme.handleAccent,
					pointerEvents: "none",
				}}
			/>
			<rect
				x={hitLeft}
				y={band.y}
				width={hitWidth}
				height={band.height}
				data-kind="control"
				data-id={objectId}
				data-action={action}
				style={{ fill: "none", pointerEvents: "all", cursor: "pointer" }}
			/>
		</>
	);
};

export const ErEntityColumnGrip = memo(ErEntityColumnGripComponent);
