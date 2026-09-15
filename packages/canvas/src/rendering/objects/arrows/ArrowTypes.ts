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
	scale: number;
	dataKind?: string;
	dataId?: string;
};
