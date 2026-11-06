import type { Dimensions, Rect } from "@jiscribe/geometry";

import type {
	TextSlot,
	TextSlotStyle,
} from "../model/objects/types/text/TextSlot";

/**
 * Calculates where a `features.text: "label"` type places its caption: a
 * rectangle sized from the caption's own text (calcLabelTextBoxSize), set
 * wherever the type draws it — below the box by default
 * (calcLabelTextRegion, itself one of these), beyond a brace's tip, inside an
 * AWS group's title band. In the shape's local coordinates, origin at the
 * center of the bounding box.
 *
 * The canvas calls the same declaration with an object's state — its box and
 * its body slot — both to place the caption and to widen the object's visual
 * bounds by it, so read only the width/height and the type's own fields
 * (`extraKeys`), which a state carries too.
 *
 * @param box - The shape's untransformed box plus the fields of its own the placement reads (`TDoc`)
 * @param body - The caption's content and styling, in the form the caller holds it: a doc's root text fields or a state's body slot (see calcLabelTextBoxSize); undefined sizes an empty caption
 * @param typeDefaults - The type's defaults for its body slot (ObjectTextStyleDefaultsRegistry); undefined for a type that declares none
 */
export type ObjectDocLabelRegionCalculator<
	TDoc extends Dimensions = Dimensions,
> = (
	box: TDoc,
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
) => Rect;
