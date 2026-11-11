import type { Rect } from "@jiscribe/geometry";
import type { LayoutVisualMargin } from "@jiscribe/layout";

import type { ObjectRecord } from "./objectAccess";
import {
	type DocDefinitions,
	readBodyTextStyleDefaults,
} from "./objectGeometry";
import { isTransformed } from "./transformFields";
import { isRichText } from "../../model/objects/types/text/RichText";
import type { TextSlot } from "../../model/objects/types/text/TextSlot";
import { calcLabelTextLayoutMargin } from "../../text/label/calcLabelTextLayoutMargin";
import {
	calcLabelTextRegion,
	isLabelTextDrawn,
} from "../../text/label/calcLabelTextRegion";

/** The object's caption as calcLabelTextLayoutMargin and calcLabelTextRegion take it. */
const readLabelTextBody = (
	object: ObjectRecord,
): Partial<TextSlot> | undefined =>
	isRichText(object.text) ? (object as Partial<TextSlot>) : undefined;

/**
 * What the object draws past its box, which the layout keeps room for: a `"label"`
 * type's caption (calcLabelTextLayoutMargin), measured in the font it is drawn with.
 *
 * @param bounds - The object's box as the layout is given it
 */
export const readLayoutVisualMargin = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): LayoutVisualMargin | undefined => {
	const definition = definitions.get(object.type);
	return definition === undefined
		? undefined
		: calcLabelTextLayoutMargin(
				definition.features.text,
				bounds,
				readLabelTextBody(object),
				readBodyTextStyleDefaults(definition),
				isTransformed(object),
			);
};

/**
 * Where a `"label"` type hangs its caption (calcLabelTextRegion), in the shape's local
 * coordinates (its centre the origin), or undefined for any other type and for a
 * caption that draws nothing (isLabelTextDrawn).
 *
 * @param bounds - The object's untransformed box
 */
export const readLocalLabelTextRegion = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): Rect | undefined => {
	const definition = definitions.get(object.type);
	const body = readLabelTextBody(object);
	return definition?.features.text !== "label" || !isLabelTextDrawn(body)
		? undefined
		: calcLabelTextRegion(bounds, body, readBodyTextStyleDefaults(definition));
};
