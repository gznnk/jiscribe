import { roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";

import type { RecordDoc } from "../schema/RecordDoc";

/** Where a record stands once its height changes: the stored corner and extent. */
type RecordDocVerticalFrame = Pick<RecordDoc, "x" | "y" | "height">;

/**
 * The corner and height a record takes at a new height with the edge its title
 * hangs from left where it is drawn, so the box grows and shrinks away from it.
 * Unturned that is the stored top edge and `y` stays; turned or flipped, the
 * centre the transform pivots on moves along the box's own vertical axis instead.
 *
 * @param record - The record as stored; `rotation` (degrees, clockwise) and `flipY` decide where its local top edge is drawn
 * @param height - The new untransformed height in local pixels
 * @returns The new `x` / `y` / `height`; `x` / `y` are the stored ones untouched when the record is neither turned nor flipped vertically
 */
export const calcRecordDocFrameAtHeight = (
	record: RecordDoc,
	height: number,
): RecordDocVerticalFrame => {
	const rotation = record.rotation ?? 0;
	if (rotation === 0 && record.flipY !== true) {
		return { x: record.x, y: record.y, height };
	}
	const halfGrowth = (height - record.height) / 2;
	const center = calcAffineTransformedPoint(
		0,
		halfGrowth,
		record.flipX === true ? -1 : 1,
		record.flipY === true ? -1 : 1,
		degreesToRadians(rotation),
		record.x + record.width / 2,
		record.y + record.height / 2,
	);
	return {
		x: roundDocCoordinate(center.x - record.width / 2),
		y: roundDocCoordinate(center.y - height / 2),
		height,
	};
};
