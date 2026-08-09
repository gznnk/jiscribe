import type { Point } from "@jiscribe/geometry";

import { mapCanonicalGroupMarkerPoint } from "./groupMarkerGeometry";
import type { GroupMarkerDirection } from "../../schema/shared/GroupMarkerFields";

/** One SVG path command in canonical marker space: the letter plus the points it takes. */
export type CanonicalGroupMarkerCommand = {
	/** Command letter; the markers need only a move, a line and a quadratic curve. */
	command: "M" | "L" | "Q";
	/** The command's points in canonical space (x in [0, depth], y in [0, span]). */
	points: Point[];
};

/**
 * Places a canonical command list onto the box whose top-left corner is at
 * (x, y). Every marker builds its shape once, facing left, and reaches the other
 * three directions through this mapping alone — which is why the path, the tip
 * and the label anchor cannot drift apart.
 *
 * The result is an open path — a marker is a line, not a silhouette — so it must
 * be drawn with `fill: none`.
 *
 * @param commands The canonical shape; a second `M` starts a detached sub-path (the stem).
 * @param x Left edge of the box in local coordinates.
 * @param y Top edge of the box in local coordinates.
 * @param width Box width; the depth for a left/right marker, the span otherwise.
 * @param height Box height; the span for a left/right marker, the depth otherwise.
 * @param direction Which way the marker faces, away from the grouped shapes.
 * @returns An SVG path `d`, never closed.
 */
export const buildGroupMarkerPath = (
	commands: readonly CanonicalGroupMarkerCommand[],
	x: number,
	y: number,
	width: number,
	height: number,
	direction: GroupMarkerDirection,
): string =>
	commands
		.map(({ command, points }) => {
			const placed = points
				.map((point) => {
					const { x: px, y: py } = mapCanonicalGroupMarkerPoint(
						point,
						x,
						y,
						width,
						height,
						direction,
					);
					return `${px} ${py}`;
				})
				.join(" ");
			return `${command} ${placed}`;
		})
		.join(" ");
