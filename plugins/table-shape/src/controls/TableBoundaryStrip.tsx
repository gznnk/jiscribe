import {
	calcEuclideanDistance,
	calcVectorAngleRad,
	radiansToDegrees,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

/**
 * How thick the strip is, in screen px, straddling the rule it follows. Wide
 * enough to aim at without a steady hand; narrow enough that the cells either
 * side keep the double click that opens them for editing, since the strip is
 * drawn over them.
 *
 * Also the clearance a strip keeps from a transform handle it would otherwise
 * cover (TableRowBoundaryControl).
 */
export const BOUNDARY_HIT_WIDTH = 8;

/**
 * Paint of a strip that is a target and nothing else. `transparent` counts as
 * painted for hit testing under the default `pointer-events: visiblePainted`,
 * where `none` would not — the same trick the cell surfaces use. Nothing is added
 * to what is drawn: the rule already marks where the boundary is, and the cursor
 * is what says it can be grabbed.
 */
const HIT_STRIP_PAINT = "transparent";

type TableBoundaryStripProps = {
	/** One end of the boundary in world coordinates. */
	from: Point;
	/** The other end in world coordinates; swapping the two only turns the strip end for end. */
	to: Point;
	/** Canvas zoom, which the thickness is divided by so the strip stays the same size on screen at any zoom. */
	zoom: number;
	/** The table the strip belongs to, as `data-id`. */
	objectId: string;
	/** The whole `data-part`, boundary index included, which is what routes the drag to a boundary. */
	part: string;
	/** CSS cursor shown over the strip; the caller resolves it against the table's rotation and flips (getResizeCursorForRotation), so it points the way the drag actually goes. */
	cursor: string;
};

/**
 * One draggable boundary: an invisible strip laid along a rule, from one end of
 * it to the other. Drawn in world coordinates from the two endpoints rather than
 * from the table's box, so its length and angle follow whatever the transform did
 * to the rule — a rotated table's strips lie on its rules, and a flipped one's
 * are simply turned end for end.
 *
 * Carries the control data attributes the gesture layer routes on
 * (`data-kind="control"` + the table's id + the part naming the boundary).
 */
const TableBoundaryStripComponent: React.FC<TableBoundaryStripProps> = ({
	from,
	to,
	zoom,
	objectId,
	part,
	cursor,
}) => {
	const length = calcEuclideanDistance(from.x, from.y, to.x, to.y);
	const angle = radiansToDegrees(
		calcVectorAngleRad(to.x, to.y, from.x, from.y),
	);
	const thickness = BOUNDARY_HIT_WIDTH / zoom;

	return (
		<g
			transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2}) rotate(${angle})`}
		>
			<rect
				x={-length / 2}
				y={-thickness / 2}
				width={length}
				height={thickness}
				data-kind="control"
				data-id={objectId}
				data-part={part}
				style={{ fill: HIT_STRIP_PAINT, cursor }}
			/>
		</g>
	);
};

export const TableBoundaryStrip = memo(TableBoundaryStripComponent);
