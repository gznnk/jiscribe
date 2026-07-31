import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";

/**
 * Build a rect Doc for tests.
 *
 * A Doc is top-left based (x, y) plus width and height; canvasToState converts it to a center
 * (cx, cy) — e.g. x=0, y=0, w=10, h=10 becomes cx=5, cy=5.
 */
export const rectDoc = (
	id: string,
	x: number,
	y: number,
	size = 10,
): unknown => ({
	id,
	type: "rect",
	x,
	y,
	width: size,
	height: size,
});

/**
 * Document holding two rects.
 * rect-1 → cx=5,cy=5 / rect-2 → cx=105,cy=105。
 */
export const twoRectsDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-1", 0, 0), rectDoc("rect-2", 100, 100)],
} as unknown as CanvasDoc;
