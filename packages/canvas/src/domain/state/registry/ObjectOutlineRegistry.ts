import type { Dimensions, Point } from "@jiscribe/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Produces a shape's true outline (the drawn silhouette — NOT the bounding
 * box) as a closed polygon in the shape's local coordinate space (origin at
 * the center, width/height units, before transform), from its state
 * (width/height plus any per-shape fields, e.g. the callout's tail in
 * `@jiscribe/plugin-annotation-shapes`). Curved
 * shapes return a sampled polyline. This is the single seam shared by the
 * connector endpoint resolver and the connection-anchor dots so both attach to
 * the drawn outline rather than the bounding box. Implementations declare what
 * they read via `TState` (most: `ObjectOutlineCalculator<Dimensions>`); the
 * registry stores the default instantiation, to which narrower readers are
 * assignable by contravariance.
 */
export type ObjectOutlineCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => Point[];

/**
 * Per-type registry of outline calculators. Types without a registered
 * calculator fall back to the bounding-box rect/ellipse handling in the
 * connector resolver.
 */
export class ObjectOutlineRegistry {
	private readonly calculators = new Map<ObjectType, ObjectOutlineCalculator>();

	register(type: ObjectType, calculator: ObjectOutlineCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectOutlineCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectOutlineRegistry = (): ObjectOutlineRegistry =>
	new ObjectOutlineRegistry();
