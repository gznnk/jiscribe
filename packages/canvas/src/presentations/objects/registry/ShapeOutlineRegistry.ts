import type { Dimensions, Point } from "@workspace/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Produces a shape's true outline (the drawn silhouette — NOT the bounding
 * box) as a closed polygon in the shape's local coordinate space (origin at
 * the center, width/height units, before transform), from its state
 * (width/height plus any per-shape fields, e.g. the callout's tail). Curved
 * shapes return a sampled polyline. This is the single seam shared by the
 * connector endpoint resolver and the connection-anchor dots so both attach to
 * the drawn outline rather than the bounding box. Implementations declare what
 * they read via `TState` (most: `ShapeOutlineProvider<Dimensions>`); the
 * registry stores the default instantiation, to which narrower readers are
 * assignable by contravariance.
 */
export type ShapeOutlineProvider<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => Point[];

/**
 * Per-type registry of outline providers. Types without a registered provider
 * fall back to the bounding-box rect/ellipse handling in the connector resolver.
 */
export class ShapeOutlineRegistry {
	private readonly providers = new Map<ObjectType, ShapeOutlineProvider>();

	register(type: ObjectType, provider: ShapeOutlineProvider): void {
		this.providers.set(type, provider);
	}

	get(type: ObjectType): ShapeOutlineProvider | undefined {
		return this.providers.get(type);
	}

	clear(): void {
		this.providers.clear();
	}
}

export const createShapeOutlineRegistry = (): ShapeOutlineRegistry =>
	new ShapeOutlineRegistry();
