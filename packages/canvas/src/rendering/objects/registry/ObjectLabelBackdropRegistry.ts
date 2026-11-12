import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/** One area a frame paints as a backdrop, in the order it paints them. */
export type ObjectLabelBackdropRegion = {
	/** The area, in the shape's local coordinates (origin at the center, before its transform). */
	rect: Rect;
	/** The color it is painted in, resolved: a CSS color, or a `var(--jiscribe-…)` theme token, never `"auto"`. */
	fill: string;
	/** Its fill opacity, 0 to 1, multiplying the alpha `fill` already carries. */
	fillOpacity: number;
};

/**
 * Lists what a frame (container, awsGroup) paints under the objects drawn on
 * it, bottom first, so an `"auto"` label lying on it is painted on the same
 * colors rather than on the page's (resolveLabelBackdrops). Only a type that
 * declares one counts as a backdrop; a shape that merely has a fill does not.
 *
 * Takes the state and the body fill core resolved from it the way
 * createFrameObject does (the state's own field, the type's default, the last
 * resort; `"auto"` turned into the theme surface), so an implementation never
 * repeats the defaults. A region the core finds painting nothing (a
 * transparent color, opacity 0) is dropped by the core.
 */
export type ObjectLabelBackdropCalculator<
	TState extends ObjectState = ObjectState,
> = (
	state: TState,
	style: {
		/** The body's fill color, resolved as `FrameShapeProps.fillColor` is. */
		fillColor: string;
		/** The body's fill opacity, resolved as `FrameShapeProps.fillAlpha` is. */
		fillAlpha: number;
	},
) => readonly ObjectLabelBackdropRegion[];

/**
 * Per-type registry of label-backdrop calculators. A type without one is
 * never under a label as far as the label's `"auto"` background is concerned.
 */
export class ObjectLabelBackdropRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectLabelBackdropCalculator
	>();

	register(type: ObjectType, calculator: ObjectLabelBackdropCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectLabelBackdropCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectLabelBackdropRegistry =
	(): ObjectLabelBackdropRegistry => new ObjectLabelBackdropRegistry();
