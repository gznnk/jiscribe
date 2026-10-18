import type { SelectionControlDragEvent } from "@jiscribe/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import type { ErEntityState } from "../state/ErEntityState";

/**
 * How far a control drag has moved along the entity's own axes: the pointer at
 * gesture start and the pointer now, each taken back through the entity's
 * transform, subtracted. A mirrored entity comes out with the sign reversed,
 * which keeps the boundary following the cursor.
 *
 * The transform is read off the gesture-start snapshot: a drag that widens the
 * box moves its center on every frame (resizeErEntityFromDrawnCorner), which
 * would otherwise move the space the delta is measured in.
 *
 * @param startEntity - The entity as of gesture start; its center, rotation and flips define the axes, and its scales must be non-zero (the inverse transform divides by them)
 * @param event - The drag, whose `start` and `last` are read as SVG/world coordinates
 * @returns The movement in the entity's local px, the flips' signs applied
 */
export const calcErEntityLocalDragDelta = (
	startEntity: ErEntityState,
	event: SelectionControlDragEvent,
): Point => {
	const radians = degreesToRadians(startEntity.rotation);
	const localStart = calcInverseAffineTransformedPoint(
		event.start.x,
		event.start.y,
		startEntity.scaleX,
		startEntity.scaleY,
		radians,
		startEntity.cx,
		startEntity.cy,
	);
	const localLast = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startEntity.scaleX,
		startEntity.scaleY,
		radians,
		startEntity.cx,
		startEntity.cy,
	);
	return { x: localLast.x - localStart.x, y: localLast.y - localStart.y };
};
