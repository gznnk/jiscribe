import { DB_CAP_RATIO } from "../../schema/db/DbDoc";

/**
 * Builds the cylinder paths centered at the origin.
 * - body: the full silhouette (top bulge, straight sides, bottom bulge), closed for fill
 * - capEdge: the front (lower) half of the top cap ellipse, stroked only
 *
 * Both caps are half ellipses as tall as DB_CAP_RATIO of the box, so the two
 * bulges eat into the straight sides rather than extending past the box.
 *
 * @param width - Bounding-box width; also the full width of each cap ellipse
 * @param height - Bounding-box height, which the cap depth follows
 * @returns The closed body path and the stroked-only front edge of the top cap
 */
export const buildDbPaths = (
	width: number,
	height: number,
): { bodyPath: string; capEdgePath: string } => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const capRy = height * DB_CAP_RATIO;
	const topY = -halfHeight + capRy;
	const bottomY = halfHeight - capRy;
	const arc = `${halfWidth} ${capRy} 0 0`;

	return {
		bodyPath:
			`M ${-halfWidth} ${topY} A ${arc} 1 ${halfWidth} ${topY} ` +
			`L ${halfWidth} ${bottomY} A ${arc} 1 ${-halfWidth} ${bottomY} Z`,
		capEdgePath: `M ${-halfWidth} ${topY} A ${arc} 0 ${halfWidth} ${topY}`,
	};
};
