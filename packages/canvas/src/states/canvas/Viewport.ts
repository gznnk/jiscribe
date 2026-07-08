export type Viewport = {
	minX: number;
	minY: number;
	width: number;
	height: number;
	zoom: number;
};

/**
 * The host-controllable part of the viewport (pan + zoom). Width/height are
 * excluded: they are container-measured, not host-set.
 */
export type Camera = Pick<Viewport, "minX" | "minY" | "zoom">;

/** True when two cameras describe the same pan/zoom. */
export const isSameCamera = (a: Camera, b: Camera): boolean =>
	a.minX === b.minX && a.minY === b.minY && a.zoom === b.zoom;
