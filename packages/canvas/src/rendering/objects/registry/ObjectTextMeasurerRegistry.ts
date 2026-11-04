import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * What a type's own measurement of a text slot answers. Core adds the rest of
 * a TextSlotMeasurement — the region's bounds and size, and whether the slot
 * overflows it — the same way for every type (measureTextSlot).
 */
export type ObjectTextMeasurement = {
	/**
	 * Size the laid-out body takes, box padding included, in the shape's local
	 * px — usually measureTextOverlayContent's answer, which says how its width
	 * is read (see TextSlotMeasurement.textSize).
	 */
	textSize: Dimensions;
	/** Drawn line count, or null (see TextSlotMeasurement.lineCount). */
	lineCount: number | null;
};

/**
 * Measures one text slot of a type that draws its body itself instead of
 * through the shared plain-text layout (`features.text: "source"`, Markdown
 * for one), by laying the body out the way its overlay draws it — usually
 * with measureTextOverlayContent. Runs in the browser only, and only when a
 * host asks (`measure.textSlot`), never on a gesture's path. Implementations
 * declare what they read via `TState`; the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 *
 * @param object - The object whose slot is measured; it holds `slotId`
 * @param slotId - Key of the object's `text` to measure
 * @param context - The box and style the overlay draws the slot with
 */
export type ObjectTextMeasurer<TState extends ObjectState = ObjectState> = (
	object: TState,
	slotId: string,
	context: {
		/** Size of the region the slot is drawn in, local px, both positive. */
		regionSize: Dimensions;
		/**
		 * The slot's style resolved against the type's defaults
		 * (resolveTextSlotStyle) — what the overlay is drawn with.
		 */
		style: TextSlotStyle;
	},
) => ObjectTextMeasurement;

/**
 * Per-type registry of text measurers. Types without a registered measurer
 * are measured as plain text through `layoutVisualLines` (see measureTextSlot).
 */
export class ObjectTextMeasurerRegistry {
	private readonly measurers = new Map<ObjectType, ObjectTextMeasurer>();

	register(type: ObjectType, measurer: ObjectTextMeasurer): void {
		this.measurers.set(type, measurer);
	}

	get(type: ObjectType): ObjectTextMeasurer | undefined {
		return this.measurers.get(type);
	}

	clear(): void {
		this.measurers.clear();
	}
}

export const createObjectTextMeasurerRegistry =
	(): ObjectTextMeasurerRegistry => new ObjectTextMeasurerRegistry();
