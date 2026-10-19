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
 * entity it heads at any zoom: the width of a row's heading and the height of a
 * lane's. The table's grip thickness, so the two shapes' headings read as one
 * kind of chrome.
 */
export const GRIP_THICKNESS = 24;

/**
 * A selected grip's face: the accent faded into the surface. The full accent
 * filling a whole strip of headings is louder than the selection it stands for.
 */
const SELECTED_GRIP_FILL = `color-mix(in srgb, ${theme.handleAccent} 18%, ${theme.surface})`;

/** Size of the heading's text, in world units like the grip it sits on. */
const GRIP_LABEL_FONT_SIZE = 10;

/** The heading's face: the canvas's own UI sans, not the document's text font, a heading being chrome rather than content. */
const GRIP_LABEL_FONT_FAMILY = "Arial, Helvetica, sans-serif";

/**
 * Distance from the entity's edge to the grip's centre line, in world units. The
 * grips abut the entity the way a spreadsheet's headings do, so it is half the
 * thickness and nothing more.
 */
export const GRIP_OFFSET = GRIP_THICKNESS / 2;

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
 * Distance from the entity's edge to a connection-anchor dot on an edge the
 * grips line (top and left), in screen px. The grips are sized in world units,
 * so how far they reach on screen is read at the zoom asked about.
 *
 * @param zoom - Canvas zoom (1 = 100%)
 * @returns The distance for the top midpoint and every column's left point (`col:<i>:left`)
 */
export const calcConnectionAnchorOffsetPastGrips = (zoom: number): number =>
	GRIP_THICKNESS * zoom +
	CONNECTION_ANCHOR_RADIUS +
	CONNECTION_ANCHOR_CONTROL_CLEARANCE;

type ErEntityGripProps = {
	/** The grip's centre line's start, in world coordinates; already offset clear of the entity's edge. */
	from: Point;
	/** Its end, in world coordinates; swapping the two only turns the grip end for end. */
	to: Point;
	/**
	 * The point on the entity's edge the grip's middle faces, in world
	 * coordinates: which side of the centre line the entity is on, read off the
	 * drawing rather than assumed, so a flipped or rotated entity still gets it
	 * right.
	 */
	edgeMid: Point;
	/** The entity the grip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, part id included, which is what routes the click to a row or a lane. */
	action: string;
	/** The heading drawn on the grip: the row's number or the lane's name. */
	label: string;
	/** Whether this row or lane is among the picked parts; tints the cell with the accent and inks the label in it, the border staying as it is. */
	selected: boolean;
};

/**
 * One row's or one lane's grip: a heading cell laid against what it stands for,
 * abutting the entity's edge, as a table's track grip is (the same thickness,
 * faces and border). Clicking it picks that whole row or lane, and Shift or
 * Ctrl / Meta grow or trim a pick of several (createErEntityGripHandler).
 *
 * The cell follows the entity's transform; the label is drawn upright whatever
 * the rotation: a heading is read as a heading rather than as part of the
 * drawing.
 *
 * The drawn cell and the pressable region are separate elements. The cell itself
 * takes no pointer; an unpainted rect on top, covering the whole cell, carries
 * the control data attributes the gesture layer routes on. The label takes no
 * pointer either, so no press resolves to it instead of the control. Where the
 * left width handle overlaps a row grip, the handle takes the press, the grips
 * being drawn under the core handles.
 */
const ErEntityGripComponent: React.FC<ErEntityGripProps> = ({
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
	// clockwise on screen; the entity lies on that side when its edge does.
	const entityOnPositiveSide =
		-(to.y - from.y) * (edgeMid.x - mid.x) +
			(to.x - from.x) * (edgeMid.y - mid.y) >
		0;
	// The border leaves out the side against the entity, where it would be
	// drawn over the selection outline.
	const entitySideY = entityOnPositiveSide ? thickness / 2 : -thickness / 2;
	const borderPath = `M ${-length / 2} ${entitySideY} V ${-entitySideY} H ${length / 2} V ${entitySideY}`;

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

export const ErEntityGrip = memo(ErEntityGripComponent);
