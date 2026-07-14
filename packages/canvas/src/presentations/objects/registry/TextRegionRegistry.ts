import type { Dimensions, Rect } from "@workspace/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

/**
 * Calculates a shape's text region from its untransformed dimensions, in the
 * shape's local coordinate space (origin at the center, top-left based Rect).
 */
export type TextRegionCalculator = (dimensions: Dimensions) => Rect;

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
