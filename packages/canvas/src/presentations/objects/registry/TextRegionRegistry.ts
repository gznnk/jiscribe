import type { Dimensions, Rect } from "@workspace/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Calculates a shape's text region from its state (untransformed width/height
 * plus any per-shape fields, e.g. the container's headerHeight), in the
 * shape's local coordinate space (origin at the center, top-left based Rect).
 * Calculators that only need the dimensions may keep a
 * `(dimensions: Dimensions) => Rect` signature — it stays assignable.
 */
export type TextRegionCalculator = (state: ObjectState & Dimensions) => Rect;

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
