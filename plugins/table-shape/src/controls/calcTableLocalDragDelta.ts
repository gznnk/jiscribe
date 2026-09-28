import type { SelectionControlEvent } from "@jiscribe/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import type { TableState } from "../state/TableState";

/**
 * How far a control drag has moved along the table's own axes: the pointer at
 * gesture start and the pointer now, each taken back through the table's
 * transform, subtracted. In those axes a boundary drag is one signed number per
 * axis whatever the table's rotation is, and a mirrored table comes out with the
 * sign reversed — which is what keeps the boundary following the cursor instead
 * of running away from it.
 *
 * The transform is read off the gesture-start snapshot, never the live object: a
 * table's box is re-derived from its own grid on every frame of the drag
 * (resizeTableStateToContent), so measuring against the live center would move
 * the space the delta is measured in halfway through the gesture.
 *
 * @param startTable - The table as of gesture start; its center, rotation and flips define the axes, and its scales must be non-zero (the inverse transform divides by them)
 * @param event - The drag, whose `start` and `last` are read as SVG/world coordinates
 * @returns The movement in the table's local px — the units its column widths and row heights are stated in, the flips' signs applied
 */
export const calcTableLocalDragDelta = (
	startTable: TableState,
	event: SelectionControlEvent,
): Point => {
	const radians = degreesToRadians(startTable.rotation);
	const localStart = calcInverseAffineTransformedPoint(
		event.start.x,
		event.start.y,
		startTable.scaleX,
		startTable.scaleY,
		radians,
		startTable.cx,
		startTable.cy,
	);
	const localLast = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startTable.scaleX,
		startTable.scaleY,
		radians,
		startTable.cx,
		startTable.cy,
	);
	return { x: localLast.x - localStart.x, y: localLast.y - localStart.y };
};
