/** The world rectangle the canvas shows, and the pixel box it is shown in. */
export type Viewport = {
	/** World x of the view's left edge. */
	minX: number;
	/** World y of the view's top edge. */
	minY: number;
	/** Container width in CSS px, as measured (not a world length). */
	width: number;
	/** Container height in CSS px, as measured (not a world length). */
	height: number;
	/** World → px scale; 1 draws a world unit as one CSS px. */
	zoom: number;
};
