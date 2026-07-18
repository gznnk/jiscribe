import type { Dimensions, Point } from "@workspace/geometry";

import type { ShapeOutlineProvider } from "../registry/ShapeOutlineRegistry";

/**
 * Polyline sampling density for curved shape outlines. Density is a
 * presentation-side choice; the geometry samplers take `segments` explicitly.
 */
export const OUTLINE_CURVE_SEGMENTS = 12;

/**
 * Adapts a top-left-origin polygon point builder into a centered-origin
 * ShapeOutlineProvider<Dimensions>, so the renderer/preview and the connector
 * outline share the same point list.
 */
export const centeredPolygonOutline =
	(
		build: (x: number, y: number, width: number, height: number) => Point[],
	): ShapeOutlineProvider<Dimensions> =>
	({ width, height }) =>
		build(-width / 2, -height / 2, width, height);
