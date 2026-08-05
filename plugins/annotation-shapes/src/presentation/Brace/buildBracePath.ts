import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import type { CanonicalGroupMarkerCommand } from "../shared/buildGroupMarkerPath";
import { buildGroupMarkerPath } from "../shared/buildGroupMarkerPath";
import { calcGroupMarkerAxes } from "../shared/groupMarkerGeometry";

/**
 * The canonical brace as four quadratic segments: each arm runs from its end
 * into the spine (the depth/2 line) and back out to the tip. Both segments of an
 * arm share the spine as their control x, which is what makes the join between
 * them smooth; the two arms meet at the tip as a cusp, which is the point of a
 * brace rather than a defect.
 *
 * @param depth How far the curve bulges out from the arms.
 * @param span How far the arms reach.
 * @param tipPosition 0..1 along the span; 0 and 1 collapse one arm to nothing.
 */
const buildCanonicalBrace = (
	depth: number,
	span: number,
	tipPosition: number,
): CanonicalGroupMarkerCommand[] => {
	const tip = tipPosition * span;
	const spine = depth / 2;
	return [
		{ command: "M", points: [{ x: depth, y: 0 }] },
		{
			command: "Q",
			points: [
				{ x: spine, y: 0 },
				{ x: spine, y: tip / 2 },
			],
		},
		{
			command: "Q",
			points: [
				{ x: spine, y: tip },
				{ x: 0, y: tip },
			],
		},
		{
			command: "Q",
			points: [
				{ x: spine, y: tip },
				{ x: spine, y: (tip + span) / 2 },
			],
		},
		{
			command: "Q",
			points: [
				{ x: spine, y: span },
				{ x: depth, y: span },
			],
		},
	];
};

/**
 * Builds the brace path for a bounding box whose top-left corner is at (x, y).
 * Shared by the object renderer (centered origin) and the stencil icon.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width; the depth for a left/right brace, the span otherwise.
 * @param height Box height; the span for a left/right brace, the depth otherwise.
 * @param direction Which way the tip points, away from the grouped shapes.
 * @param tipPosition 0..1 along the span, from the top (left/right) or the left (up/down).
 * @returns An open SVG path `d` with one move and four quadratic segments.
 */
export const buildBracePath = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
	tipPosition: number,
): string => {
	const { depth, span } = calcGroupMarkerAxes(width, height, direction);
	return buildGroupMarkerPath(
		buildCanonicalBrace(depth, span, tipPosition),
		x,
		y,
		width,
		height,
		direction,
	);
};
