import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";
import type { CanonicalGroupMarkerCommand } from "../shared/buildGroupMarkerPath";
import { buildGroupMarkerPath } from "../shared/buildGroupMarkerPath";
import { calcGroupMarkerAxes } from "../shared/groupMarkerGeometry";

/**
 * The canonical stemmed bracket: the spine is pulled in to the depth/2 line so
 * the stem has somewhere to run, and the stem leaves it at right angles for the
 * outer edge. The stem is a second sub-path (its own `M`) rather than a detour
 * along the spine, so the spine stays one unbroken line.
 *
 * @param depth How far the feet reach in from the outer edge; the spine sits half way.
 * @param span How far the spine runs.
 * @param tipPosition 0..1 along the span; 0 and 1 put the stem at a corner of the spine.
 */
const buildCanonicalBracketWithStem = (
	depth: number,
	span: number,
	tipPosition: number,
): CanonicalGroupMarkerCommand[] => {
	const spine = depth / 2;
	const tip = tipPosition * span;
	return [
		{ command: "M", points: [{ x: depth, y: 0 }] },
		{ command: "L", points: [{ x: spine, y: 0 }] },
		{ command: "L", points: [{ x: spine, y: span }] },
		{ command: "L", points: [{ x: depth, y: span }] },
		{ command: "M", points: [{ x: spine, y: tip }] },
		{ command: "L", points: [{ x: 0, y: tip }] },
	];
};

/**
 * Builds the stemmed square bracket path for a bounding box whose top-left
 * corner is at (x, y). Shared by the object renderer (centered origin) and the
 * stencil icon.
 *
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width; the depth for a left/right bracket, the span otherwise.
 * @param height Box height; the span for a left/right bracket, the depth otherwise.
 * @param direction Which way the stem points, away from the grouped shapes.
 * @param tipPosition 0..1 along the span, from the top (left/right) or the left (up/down).
 * @returns An open SVG path `d` of two sub-paths: the bracket, then the stem.
 */
export const buildBracketWithStemPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
	tipPosition: number,
): string => {
	const { depth, span } = calcGroupMarkerAxes(width, height, direction);
	return buildGroupMarkerPath(
		buildCanonicalBracketWithStem(depth, span, tipPosition),
		x,
		y,
		width,
		height,
		direction,
	);
};
