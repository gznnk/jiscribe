import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { BODY_TEXT_SLOT_ID } from "../text/style/textSlotId";

/**
 * What {@link supportsAutoHeight} reads off a type: the two declarations that
 * decide the answer, plus the features that say whether there is a height to
 * decide about. A whole `ObjectDocDefinition` is one; so is the `{ features,
 * textRegion, autoHeight }` a definition is being assembled from, which is how a
 * doc validator asks before its definition exists.
 */
export type AutoHeightDeclaration = Pick<
	ObjectDocDefinition,
	"features" | "textRegion" | "autoHeight"
>;

/**
 * Box the declared text region is asked about to find out whether it holds text
 * at all. Any non-degenerate box answers the same — the shipped regions branch on
 * the shape's kind, never on its size — so one constant stands for every size,
 * and the answer stays a fact about the type rather than about one object.
 */
const AUTO_HEIGHT_PROBE_BOX: Dimensions = { width: 200, height: 100 };

/**
 * Whether a type's `height` may be left out of the document, the height then
 * following the text it holds (`calcAutoShapeHeight`).
 *
 * True for a type that stores a `height` at all (`geometry: "rect"`), carries one
 * body of text, declares a text region its box actually holds
 * (`ObjectDocDefinition.textRegion` answering a rectangle rather than `null`),
 * and has not denied it (`ObjectDocDefinition.autoHeight: false`). A shape
 * drawing its label outside the outline, one dividing its box into bands, and one
 * storing no height have nothing to derive a height from, so their `height` stays
 * required.
 *
 * @param definition - The type's declarations (see {@link AutoHeightDeclaration}); nothing outside them is read, so the answer is a fact about the type
 * @returns True when the document may omit `height` for this type
 */
export const supportsAutoHeight = (
	definition: AutoHeightDeclaration,
): boolean => {
	const { features, textRegion, autoHeight } = definition;
	if (autoHeight === false) {
		return false;
	}
	if (features.geometry !== "rect" || features.text !== "body") {
		return false;
	}
	if (textRegion === undefined) {
		return false;
	}
	return textRegion(AUTO_HEIGHT_PROBE_BOX, BODY_TEXT_SLOT_ID) !== null;
};
