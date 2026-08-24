import type { Point } from "@jiscribe/geometry";

import type { ObjectDoc } from "../base/ObjectDoc";

/** Half-size of a shape for ghost display (offset from the center). */
export type ObjectDimensions = { halfWidth: number; halfHeight: number };

/**
 * A factory that encapsulates the knowledge of how to create an object.
 * Implement one per object type and register it by type in `objectFactoryRegistry`.
 *
 * By moving switch branches such as `createObjectDoc` into this factory,
 * each caller can create objects without knowing about every object type.
 */
export type ObjectFactory = {
	/**
	 * Create an ObjectDoc from a center-based position.
	 * Used for click-based center placement and drag-and-drop placement.
	 * Point-geometry shapes read `position` as the box's drawn top-left instead:
	 * they know no box to center, so there is nothing to offset by.
	 */
	createDoc(position: Point, overrides?: Record<string, unknown>): ObjectDoc;

	/**
	 * Return the half-size for ghost display (after overrides are applied).
	 * Point-geometry shapes report zero: their box is not known until the states
	 * layer derives it from the content.
	 */
	calcDimensions(overrides?: Record<string, unknown>): ObjectDimensions;

	/**
	 * Create an ObjectDoc from a two-point bounds. Returns null if below the minimum size.
	 * Implementations that draw inside an axis-aligned box get that normalize+reject
	 * step from `calcDrawBounds`.
	 *
	 * The presence of this method indicates whether the shape can be drag-drawn.
	 * Shapes without it are center-placed on click.
	 */
	createDocFromBounds?(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		overrides?: Record<string, unknown>,
		minSize?: number,
	): ObjectDoc | null;
};
