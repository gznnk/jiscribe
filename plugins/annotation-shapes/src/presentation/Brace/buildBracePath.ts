import type { Point } from "@workspace/geometry";

import { calcBraceAxes, mapCanonicalBracePoint } from "./braceGeometry";
import type { BraceDirection } from "../../schema/brace/BraceDoc";

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
 * @returns Start point plus one entry per segment, in canonical coordinates.
 */
const buildCanonicalBrace = (
	depth: number,
	span: number,
	tipPosition: number,
): { start: Point; segments: { control: Point; end: Point }[] } => {
	const tip = tipPosition * span;
	const spine = depth / 2;
	return {
		start: { x: depth, y: 0 },
		segments: [
			{ control: { x: spine, y: 0 }, end: { x: spine, y: tip / 2 } },
			{ control: { x: spine, y: tip }, end: { x: 0, y: tip } },
			{
				control: { x: spine, y: tip },
				end: { x: spine, y: (tip + span) / 2 },
			},
			{ control: { x: spine, y: span }, end: { x: depth, y: span } },
		],
	};
};

/**
 * Builds the brace path for a bounding box whose top-left corner is at (x, y).
 * The path is open — a brace is a line, not a silhouette — so it must be drawn
 * with `fill: none`. Shared by the object renderer (centered origin) and the
 * stencil icon.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width; the depth for a left/right brace, the span otherwise.
 * @param height Box height; the span for a left/right brace, the depth otherwise.
 * @param direction Which way the tip points, away from the grouped shapes.
 * @param tipPosition 0..1 along the span, from the top (left/right) or the left (up/down).
 * @returns An SVG path `d` with one move and four quadratic segments.
 */
export const buildBracePath = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: BraceDirection,
	tipPosition: number,
): string => {
	const { depth, span } = calcBraceAxes(width, height, direction);
	const { start, segments } = buildCanonicalBrace(depth, span, tipPosition);
	const place = (point: Point): Point =>
		mapCanonicalBracePoint(point, x, y, width, height, direction);

	const head = place(start);
	const body = segments
		.map(({ control, end }) => {
			const c = place(control);
			const e = place(end);
			return `Q ${c.x} ${c.y} ${e.x} ${e.y}`;
		})
		.join(" ");
	return `M ${head.x} ${head.y} ${body}`;
};
