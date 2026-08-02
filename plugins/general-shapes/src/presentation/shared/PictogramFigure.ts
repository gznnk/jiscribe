/**
 * A pictogram's drawing, split by how it is painted. Builders return this for a
 * bounding box whose top-left corner is at (x, y), so the same builder serves
 * the object renderer (centered origin), the draw-drag preview that reuses it,
 * and the stencil icon (createPictogramIcon).
 */
export type PictogramFigure = {
	/**
	 * Closed silhouettes painted with the shape's stroke and fill, and the only
	 * parts that are hit-tested. At least one; a shape with several pieces (the
	 * laptop's screen and base) lists them back to front.
	 */
	body: string[];
	/**
	 * Stroked-only detail lines (window bars, gear teeth shading, folds). Never
	 * filled and never hit-tested, so they may cross the body freely.
	 */
	detail?: string[];
	/**
	 * Set to `"evenodd"` when a body path carries a hole as a second subpath (the
	 * gear's bore), so the fill is punched out instead of painted over.
	 */
	fillRule?: "evenodd";
	/**
	 * Invisible closed paths that are hit-tested as part of the shape, for the
	 * places the drawing occupies but does not paint: the gear's punched-out bore,
	 * the area the lock's open shackle encloses.
	 *
	 * These are not cosmetic. Hover and connector drop targets are resolved with
	 * `document.elementsFromPoint` (getHoveredElements), and the anchors a
	 * connector snaps to are drawn `pointer-events: none` — so a region the shape
	 * does not paint is a region no connector can be dropped on, however close the
	 * anchor is.
	 */
	hit?: string[];
};

/**
 * Lays a pictogram out over the bounding box whose top-left corner is at (x, y).
 * Every shape's `build*Figure` has this signature.
 */
export type PictogramFigureBuilder = (
	x: number,
	y: number,
	width: number,
	height: number,
) => PictogramFigure;
