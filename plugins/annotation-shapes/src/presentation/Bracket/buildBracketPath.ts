import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import type { CanonicalGroupMarkerCommand } from "../shared/buildGroupMarkerPath";
import { buildGroupMarkerPath } from "../shared/buildGroupMarkerPath";
import { calcGroupMarkerAxes } from "../shared/groupMarkerGeometry";

/**
 * The canonical square bracket: the spine is the outer edge itself (x = 0), with
 * a foot at each end reaching back to the arm ends. Nothing marks a place along
 * the spine, which is the whole difference from the stemmed bracket.
 *
 * @param depth How far the feet reach in from the spine.
 * @param span How far the spine runs.
 */
const buildCanonicalBracket = (
	depth: number,
	span: number,
): CanonicalGroupMarkerCommand[] => [
	{ command: "M", points: [{ x: depth, y: 0 }] },
	{ command: "L", points: [{ x: 0, y: 0 }] },
	{ command: "L", points: [{ x: 0, y: span }] },
	{ command: "L", points: [{ x: depth, y: span }] },
];

/**
 * Builds the square bracket path for a bounding box whose top-left corner is at
 * (x, y). Shared by the object renderer (centered origin) and the stencil icon.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width; the depth for a left/right bracket, the span otherwise.
 * @param height Box height; the span for a left/right bracket, the depth otherwise.
 * @param direction Which side the spine sits on, away from the grouped shapes.
 * @returns An open SVG path `d` with one move and three lines.
 */
export const buildBracketPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
): string => {
	const { depth, span } = calcGroupMarkerAxes(width, height, direction);
	return buildGroupMarkerPath(
		buildCanonicalBracket(depth, span),
		x,
		y,
		width,
		height,
		direction,
	);
};
