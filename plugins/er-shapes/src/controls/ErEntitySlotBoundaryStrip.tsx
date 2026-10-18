import { canvasThemeCssVars as theme } from "@jiscribe/canvas-sdk";
import {
	calcEuclideanDistance,
	calcVectorAngleRad,
	radiansToDegrees,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

/**
 * How thick the strip is, in screen px, straddling the boundary it follows: wide
 * enough to aim at, narrow enough that the slots either side keep the double
 * click that opens them, the strip being drawn over them.
 */
const BOUNDARY_HIT_THICKNESS = 8;

/** Width of the guide drawn along the boundary, in screen px. */
const BOUNDARY_GUIDE_WIDTH = 1;

/** Dash and gap lengths of the guide, in screen px. */
const BOUNDARY_GUIDE_DASH = [4, 2];

/**
 * Paint of a strip that is a target and nothing else: `transparent` counts as
 * painted for hit testing under the default `pointer-events: visiblePainted`,
 * where `none` would not.
 */
const HIT_STRIP_PAINT = "transparent";

type ErEntitySlotBoundaryStripProps = {
	/** One end of the boundary in world coordinates. */
	from: Point;
	/** The other end in world coordinates; swapping the two only turns the strip end for end. */
	to: Point;
	/** Canvas zoom, which the thickness is divided by so the strip stays the same size on screen. */
	zoom: number;
	/** The entity the strip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-action`, the boundary index included, which routes the drag to its boundary. */
	action: string;
	/** CSS cursor shown over the strip, already resolved against the entity's rotation and flips. */
	cursor: string;
	/** Whether the dashed guide is drawn along the strip; false where the outline the strip follows already shows it, the strip then a bare target. */
	showGuide: boolean;
};

/**
 * One draggable slot boundary: a dashed guide in the selection's accent showing
 * where it can be grabbed (unless `showGuide` is off), and an invisible strip
 * over it carrying the control data attributes the gesture layer routes on. Both are laid from one end to the
 * other in world coordinates, so a rotated or flipped entity's boundaries carry
 * them.
 */
const ErEntitySlotBoundaryStripComponent: React.FC<
	ErEntitySlotBoundaryStripProps
> = ({ from, to, zoom, objectId, action, cursor, showGuide }) => {
	const length = calcEuclideanDistance(from.x, from.y, to.x, to.y);
	const angle = radiansToDegrees(
		calcVectorAngleRad(to.x, to.y, from.x, from.y),
	);
	const thickness = BOUNDARY_HIT_THICKNESS / zoom;
	const guideDasharray = BOUNDARY_GUIDE_DASH.map(
		(dashLength) => dashLength / zoom,
	).join(" ");

	return (
		<g
			transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2}) rotate(${angle})`}
		>
			{showGuide && (
				<line
					x1={-length / 2}
					y1={0}
					x2={length / 2}
					y2={0}
					strokeWidth={BOUNDARY_GUIDE_WIDTH / zoom}
					strokeDasharray={guideDasharray}
					style={{ stroke: theme.handleAccent, pointerEvents: "none" }}
				/>
			)}
			<rect
				x={-length / 2}
				y={-thickness / 2}
				width={length}
				height={thickness}
				data-kind="control"
				data-id={objectId}
				data-action={action}
				style={{ fill: HIT_STRIP_PAINT, cursor }}
			/>
		</g>
	);
};

export const ErEntitySlotBoundaryStrip = memo(
	ErEntitySlotBoundaryStripComponent,
);
