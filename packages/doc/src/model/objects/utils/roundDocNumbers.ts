import type { Ellipse, Point, Rect } from "@jiscribe/geometry";
import { roundToDecimal } from "@jiscribe/geometry";

import { PRECISION } from "./precision";

/**
 * Rounding applied where a State turns into a Doc.
 *
 * This is the only place the persisted precision is fixed. Rounding earlier — in a
 * gesture handler or a command — does not survive, because the Doc's geometry is
 * *derived* from the State's: `x = cx - width / 2` re-introduces a float tail from
 * two already-rounded operands (`100.1 - 33.3333 / 2 -> 83.43334999999999`), and a
 * State written by a path that rounds nothing (group transforms, plugin controls,
 * docOps) reaches the Doc unrounded either way.
 *
 * Rounding runs in this direction only. The Doc → State mappers leave values alone,
 * so a doc round trip rounds each number once (see TextMapper).
 *
 * Not everything numeric belongs here. A value the State compares by exact equality
 * has to be put on the grid where it is written, or the comparison never settles:
 * a connector's free endpoint and anchor `t` (isSameEndpoint), the label's
 * position / offset, and the vertices reconcileConnectorVertices matches against.
 * Those keep rounding at their own call site.
 */

/**
 * Rounds a Doc coordinate (x / y / cx / cy) to {@link PRECISION.COORDINATE}.
 *
 * @param value - World-space coordinate; ±Infinity and NaN pass through unchanged
 */
export const roundDocCoordinate = (value: number): number =>
	roundToDecimal(value, PRECISION.COORDINATE);

/**
 * Rounds a Doc size (width / height / rx / ry) to {@link PRECISION.SIZE}.
 *
 * @param value - Extent in world units; negatives are kept as-is (this only rounds,
 *   it does not normalize a flipped box)
 */
export const roundDocSize = (value: number): number =>
	roundToDecimal(value, PRECISION.SIZE);

/**
 * Rounds a Doc rotation to {@link PRECISION.ROTATION}.
 *
 * @param value - Angle in degrees; not normalized into a range (see `normalizeRotation`)
 */
export const roundDocRotation = (value: number): number =>
	roundToDecimal(value, PRECISION.ROTATION);

/**
 * Rounds a Doc point.
 *
 * @param point - Point in world space; returns a new object, leaving the argument untouched
 */
export const roundDocPoint = (point: Point): Point => ({
	x: roundDocCoordinate(point.x),
	y: roundDocCoordinate(point.y),
});

/**
 * Rounds every point of a Doc's `points` array.
 *
 * @param points - Waypoints in world space; an empty array returns a new empty array
 */
export const roundDocPoints = (points: readonly Point[]): Point[] =>
	points.map(roundDocPoint);

/**
 * Rounds a Doc rect, coordinates and extents by their own precision.
 *
 * @param rect - Top-left based rect straight out of `convertFrameToRect`
 */
export const roundDocRect = (rect: Rect): Rect => ({
	x: roundDocCoordinate(rect.x),
	y: roundDocCoordinate(rect.y),
	width: roundDocSize(rect.width),
	height: roundDocSize(rect.height),
});

/**
 * Rounds a Doc ellipse, center and radii by their own precision.
 *
 * @param ellipse - Center based ellipse straight out of `convertFrameToEllipse`
 */
export const roundDocEllipse = (ellipse: Ellipse): Ellipse => ({
	cx: roundDocCoordinate(ellipse.cx),
	cy: roundDocCoordinate(ellipse.cy),
	rx: roundDocSize(ellipse.rx),
	ry: roundDocSize(ellipse.ry),
});
