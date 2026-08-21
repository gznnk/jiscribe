import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Calculates the region of one text slot from the shape's state (untransformed
 * width/height plus any per-shape fields, e.g. a headerHeight (see the container
 * plugin)), in the shape's local coordinate space (origin at the center, top-left
 * based Rect). Implementations declare what they read via `TState` (most:
 * `ObjectTextRegionCalculator<Dimensions>`); the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 *
 * `slotId` is a key of `state.text` (the authority on which slots a shape has).
 * A single-slot shape can simply leave the parameter out of its signature — a
 * shorter signature stays assignable.
 *
 * A calculator sizing its region from its own text measures with
 * `DEFAULT_FONT_FAMILY` wherever the slot names no family, which is also what
 * the overlay draws it in.
 */
export type ObjectTextRegionCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState, slotId: string) => Rect;

/**
 * Per-type registry of text region calculators. Types without a registered
 * calculator fall back to the full bounding box (see calcTextRegion).
 */
export class ObjectTextRegionRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectTextRegionCalculator
	>();

	register(type: ObjectType, calculator: ObjectTextRegionCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectTextRegionCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectTextRegionRegistry = (): ObjectTextRegionRegistry =>
	new ObjectTextRegionRegistry();
