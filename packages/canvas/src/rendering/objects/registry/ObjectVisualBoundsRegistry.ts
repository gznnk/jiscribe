import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Produces everything a shape draws — its geometry box plus whatever it places
 * outside it, such as a label hung below the box — as a rect in the shape's
 * local coordinate space (origin at the center, width/height units, before
 * transform), from its state.
 *
 * Only the visual-extent consumers read this: zoom-to-fit, the export viewBox,
 * viewport culling, zoom-to-selection, and where the object menu is placed.
 * Selection frames, resize handles, group bounds, snapping and the marquee stay
 * on the geometry box, so a label can never change what the user grabs or where
 * a shape snaps. A type with no registered calculator keeps the geometry box in
 * every consumer.
 *
 * Not to be confused with `ObjectOutlineCalculator`: that one feeds connector
 * endpoint resolution and the connection anchors, so anything added to it would
 * become something connectors attach to.
 *
 * Implementations declare what they read via `TState` (most:
 * `ObjectVisualBoundsCalculator<Dimensions>`); the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 *
 * Takes the state and nothing else: an implementation sizing its bounds from its
 * own text measures with `DEFAULT_FONT_FAMILY`, the same fallback the overlay
 * draws an unstyled slot in.
 */
export type ObjectVisualBoundsCalculator<
	TState extends Dimensions = ObjectState & Dimensions,
> = (state: TState) => Rect;

/**
 * Per-type registry of visual-bounds calculators. Types without a registered
 * calculator fall back to the geometry bounding box (see calcObjectBoundingBox).
 */
export class ObjectVisualBoundsRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectVisualBoundsCalculator
	>();

	register(type: ObjectType, calculator: ObjectVisualBoundsCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectVisualBoundsCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectVisualBoundsRegistry =
	(): ObjectVisualBoundsRegistry => new ObjectVisualBoundsRegistry();
