import type { Dimensions, Rect } from "@workspace/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Calculates a shape's text region from its state (untransformed width/height
 * plus any per-shape fields, e.g. a headerHeight (see the container plugin)), in the
 * shape's local coordinate space (origin at the center, top-left based Rect).
 * Implementations declare what they read via `TState` (most:
 * `TextRegionCalculator<Dimensions>`); the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 */
export type TextRegionCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => Rect;

/**
 * Per-type registry of text region calculators. Types without a registered
 * calculator fall back to the full bounding box (see calcTextRegion).
 */
export class TextRegionRegistry {
	private readonly calculators = new Map<ObjectType, TextRegionCalculator>();

	register(type: ObjectType, calculator: TextRegionCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): TextRegionCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createTextRegionRegistry = (): TextRegionRegistry =>
	new TextRegionRegistry();
