import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityLayoutInput } from "../layout/readErEntityLayoutSource";

/**
 * What moves the column connect points (calcErEntityConnectPoints) without
 * necessarily moving the frame: the rows' heights in declared order, which also
 * spell the column count. Removing one tall row and adding two short ones, or
 * moving a larger type size from one row to the next, can keep the box's size
 * while moving or renumbering the rows' points.
 *
 * Registered as the type's `geometryKey`.
 *
 * @param state - The entity; its stated slot widths and slots are read through the cached layout (readCachedErEntityLayout)
 * @returns Every row's pitch in px, comma-separated top to bottom; empty for an entity of no columns
 */
export const erEntityGeometryKey = (state: ErEntityLayoutInput): string =>
	readCachedErEntityLayout(state)
		.rows.map((row) => row.band.height)
		.join(",");
