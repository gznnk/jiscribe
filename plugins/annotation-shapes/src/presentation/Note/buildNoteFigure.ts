import { calcNoteFoldSize } from "./calcNoteFoldSize";
import { calcNotePoints } from "./calcNotePoints";

/** The two `d` strings a note is drawn from, split by how they are painted. */
export type NoteFigure = {
	/** The closed silhouette: stroked, filled, and the only hit-tested part. */
	body: string;
	/** The folded corner's two legs: stroked only, never filled or hit-tested. */
	fold: string;
};

/**
 * Lays a note out over the bounding box whose top-left corner is at (x, y): the
 * cut silhouette, plus the two legs of the folded-back corner. The diagonal
 * belongs to the silhouette rather than to the fold, so the flap reads as turned
 * back — filling the triangle separately would instead read as a second shape
 * sitting on the corner.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width; 0 yields a degenerate but well-formed path.
 * @param height Box height.
 * @returns The silhouette and the fold, both in the same local coordinates.
 */
export const buildNoteFigure = (
	x: number,
	y: number,
	width: number,
	height: number,
): NoteFigure => {
	const [start, ...rest] = calcNotePoints(x, y, width, height);
	const edges = rest.map((point) => `L ${point.x} ${point.y}`).join(" ");
	const fold = calcNoteFoldSize(width, height);
	return {
		body: `M ${start.x} ${start.y} ${edges} Z`,
		fold: `M ${x + width - fold} ${y} V ${y + fold} H ${x + width}`,
	};
};
