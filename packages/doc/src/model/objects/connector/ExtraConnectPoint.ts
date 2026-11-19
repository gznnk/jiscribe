import type { Point } from "@jiscribe/geometry";

/**
 * One named connection point a type declares beyond the four edge midpoints
 * every connectable shape already has (the brace's cusp, say). Both vectors are
 * in the shape's local coordinate space (origin at the center, width/height
 * units, before transform); the consumers apply the shape's rotation, flips and
 * position.
 */
export type ExtraConnectPoint = {
	/**
	 * Token stored in a connector's `{ kind: "connectPoint", id }` and echoed in
	 * the DOM as `data-action="anchor:<id>"`. Must not collide with a built-in
	 * ConnectPointId (`topCenter` / …) or with `"center"`, and must stay stable
	 * across releases: it is what a saved doc refers to.
	 */
	id: string;
	/** Where the anchor sits, in local coordinates. */
	point: Point;
	/**
	 * Local outward unit vector — the way a connector leaves the shape here. Snapped
	 * to the nearest of the four axes when the orthogonal router asks for it, so a
	 * diagonal is legal but resolves to one axis.
	 */
	direction: Point;
};
