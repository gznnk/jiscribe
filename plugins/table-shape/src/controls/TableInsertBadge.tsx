import {
	canvasThemeCssVars as theme,
	useCanvasTheme,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

/**
 * How big the badge is drawn, in screen px, measured from its centre. A button
 * rather than a heading, so smaller than the grips are thick.
 */
export const INSERT_BADGE_RADIUS = 6;

/**
 * Gap between the table's edge and the near side of a badge, in screen px. Wider
 * than the transform frame's anchor radius (4), because the width handles sit on
 * the left and right edges at the table's mid-height and the selection controls
 * are drawn after the transform ones (SelectionControlsLayer) — a badge reaching
 * that far would take the press meant for a handle.
 */
const INSERT_BADGE_GAP = 7;

/** Distance from the table's edge to a badge's centre, in screen px. */
export const INSERT_BADGE_OFFSET = INSERT_BADGE_GAP + INSERT_BADGE_RADIUS;

/** Half the length of each arm of the `+`, as a share of the badge's radius. */
const PLUS_ARM_RATIO = 0.5;

type TableInsertBadgeProps = {
	/** The badge's centre in world coordinates, already offset clear of the table. */
	center: Point;
	/** Canvas zoom, which the radius and the stroke are divided by so the badge stays the same size on screen at any zoom. */
	zoom: number;
	/** The table the badge belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, insertion index included, which is what routes the click to a position in the grid. */
	action: string;
};

/**
 * The `+` offered at one boundary: a round button just outside the table, on the
 * edge opposite the grips, clicking which inserts a track there
 * (createTableInsertHandler). One stands at every rule and at the two outer
 * edges, so the first and the last track can be added as readily as the ones
 * between.
 *
 * Drawn upright whatever the table's rotation. Its position follows the
 * transform, but a button is read as a button rather than as part of the drawing,
 * and a tilted `+` would only be harder to recognise.
 *
 * Carries the control data attributes the gesture layer routes on
 * (`data-kind="control"` + the table's id + the action naming the position). The
 * glyph takes no pointer: it sits outside the element holding those attributes,
 * so a press landing on it would resolve to no target at all.
 */
const TableInsertBadgeComponent: React.FC<TableInsertBadgeProps> = ({
	center,
	zoom,
	objectId,
	action,
}) => {
	const { handleDimensions } = useCanvasTheme();
	const radius = INSERT_BADGE_RADIUS / zoom;
	const arm = radius * PLUS_ARM_RATIO;
	const strokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	return (
		<g transform={`translate(${center.x} ${center.y})`}>
			<circle
				r={radius}
				strokeWidth={strokeWidth}
				data-kind="control"
				data-id={objectId}
				data-action={action}
				style={{
					fill: theme.handleFill,
					stroke: theme.handleAccent,
					cursor: "pointer",
				}}
			/>
			<path
				d={`M ${-arm} 0 H ${arm} M 0 ${-arm} V ${arm}`}
				style={{
					fill: "none",
					stroke: theme.handleAccent,
					strokeWidth,
					pointerEvents: "none",
				}}
			/>
		</g>
	);
};

export const TableInsertBadge = memo(TableInsertBadgeComponent);
