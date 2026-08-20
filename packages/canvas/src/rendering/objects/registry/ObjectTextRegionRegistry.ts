import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
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
 * A single-slot shape can simply leave the parameter out of its signature, and a
 * calculator that reads nothing of the drawing context can leave out `context`
 * too — a shorter signature stays assignable.
 */
export type ObjectTextRegionCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState, slotId: string, context: ObjectTextRegionContext) => Rect;

/**
 * What a calculator needs beyond the object's own state: the drawing context the
 * host owns, which no doc can carry because it is a property of the viewer rather
 * than of the document. The same bargain ObjectContentResizeContext makes.
 */
export type ObjectTextRegionContext = {
	/**
	 * Family the host draws unstyled text in (`CanvasTheme.fontFamily`). A region
	 * sized from its own text has to measure with it: a label whose slot names no
	 * family is drawn in this one, so measuring against a constant instead sizes
	 * the box for a face the label is not in (#1).
	 */
	fontFamily: string;
};

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
