import type { Point } from "@workspace/geometry";

import type { DocCreationDefaults } from "./DocCreationDefaults";
import type { ObjectDoc } from "../base/ObjectDoc";

/** Half-size of a shape for ghost display (offset from the center). */
export type ShapeDimensions = { halfWidth: number; halfHeight: number };

/**
 * A factory that encapsulates the knowledge of how to create a shape.
 * Implement one per shape and register it by type in `shapeFactoryRegistry`.
 *
 * By moving switch branches such as `createObjectDoc` into this factory,
 * each caller can create shapes without knowing about every shape type.
 */
export type ShapeFactory = {
	/**
	 * Create an ObjectDoc from a center-based position.
	 * Used for click-based center placement and drag-and-drop placement.
	 * `docDefaults` are theme-derived defaults, applied between the shape's
	 * DOC_DEFAULTS and `overrides` (only for fields the shape declares).
	 */
	createDoc(
		position: Point,
		overrides?: Record<string, unknown>,
		docDefaults?: DocCreationDefaults,
	): ObjectDoc;

	/**
	 * Return the half-size for ghost display (after overrides are applied).
	 */
	calcDimensions(overrides?: Record<string, unknown>): ShapeDimensions;

	/**
	 * Create an ObjectDoc from a two-point bounds. Returns null if below the minimum size.
	 *
	 * The presence of this method indicates whether the shape can be drag-drawn.
	 * Shapes without it (sticky / polygon, etc.) are center-placed on click.
	 */
	createDocFromBounds?(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		overrides?: Record<string, unknown>,
		minSize?: number,
		docDefaults?: DocCreationDefaults,
	): ObjectDoc | null;
};

/** Small helper that reads a numeric field from overrides, returning the fallback if it is not a finite number. */
export const numberOverride = (value: unknown, fallback: number): number =>
	Number.isFinite(value) ? (value as number) : fallback;

/**
 * Picks the docDefaults entries the shape actually declares in its
 * DOC_DEFAULTS. Spread between the DOC_DEFAULTS and `overrides` so theme
 * defaults replace built-in defaults without adding unsupported fields.
 */
export const pickSupportedDocDefaults = (
	defaults: Record<string, unknown>,
	docDefaults?: DocCreationDefaults,
): Partial<DocCreationDefaults> =>
	docDefaults && "fontFamily" in defaults
		? { fontFamily: docDefaults.fontFamily }
		: {};
