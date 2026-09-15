import type { Camera } from "../CanvasTypes";

/** True when two cameras describe the same pan/zoom. */
export const isSameCamera = (a: Camera, b: Camera): boolean =>
	a.minX === b.minX && a.minY === b.minY && a.zoom === b.zoom;
