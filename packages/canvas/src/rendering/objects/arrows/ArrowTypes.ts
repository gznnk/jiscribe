/**
 * Common props for arrow shape components
 */
export type ArrowShapeProps = {
	x: number;
	y: number;
	color: string;
	/**
	 * Opacity of the whole mark from 0 to 1 — the line's own `strokeOpacity`, so a
	 * translucent line ends in an equally translucent head. Applied to the element
	 * rather than to its paint, which covers the filled heads and the hollow ones
	 * alike; omitted draws fully opaque.
	 */
	opacity?: number;
	radians: number;
	/** Factor the local-unit drawing is scaled by into world units. */
	scale: number;
	/**
	 * Width (local units) of the strokes a line-drawn head is built from; filled
	 * heads ignore it. A line passes calcArrowOutlineWidth's answer.
	 */
	outlineWidth: number;
	/**
	 * The wedge between the end of a line stopped short of the tip and the tip
	 * itself, filled in the line's color; only OpenArrow draws it. Omitted draws
	 * none (see calcArrowLineEndWedge).
	 */
	lineEndWedge?: ArrowLineEndWedge;
	dataKind?: string;
	dataId?: string;
};

/**
 * Where a line stopped short of a head's tip ends, in the head's local units
 * (the tip at (0,0), the line trailing toward -x).
 */
export type ArrowLineEndWedge = {
	/** Distance from the tip back to the line's end. */
	inset: number;
	/** Half the line's width. */
	lineHalfWidth: number;
};

/**
 * How far an arrowhead's drawing runs from its tip (local units), its outline
 * left out: the axis the shapes are laid out on has the tip at (0,0) and the
 * head trailing toward -x.
 */
export type ArrowExtent = {
	/** Distance from the tip to the rearmost point of the head. */
	length: number;
	/** Half the head's spread across the line. */
	halfWidth: number;
};
