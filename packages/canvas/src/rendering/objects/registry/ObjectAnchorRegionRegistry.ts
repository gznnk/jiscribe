import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Calculates the rect the shape's edge connect points are centered on, from its
 * state (untransformed width/height plus any per-shape fields), in the shape's
 * local coordinate space (origin at the center, top-left based Rect). The rect
 * only moves the ray origin — where the anchor lands is still decided by the
 * outline — so a silhouette that tapers (the off-page connector's bottom tip)
 * keeps its left/right anchors on the middle of the body instead of the
 * bounding box. Distinct from the text region, which may additionally inset for
 * readability. Implementations declare what they read via `TState` (most:
 * `ObjectAnchorRegionCalculator<Dimensions>`); the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 */
export type ObjectAnchorRegionCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => Rect;

/**
 * Per-type registry of anchor region calculators. Types without a registered
 * calculator fall back to the full bounding box (see calcConnectPoint).
 */
export class ObjectAnchorRegionRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectAnchorRegionCalculator
	>();

	register(type: ObjectType, calculator: ObjectAnchorRegionCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectAnchorRegionCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectAnchorRegionRegistry =
	(): ObjectAnchorRegionRegistry => new ObjectAnchorRegionRegistry();
