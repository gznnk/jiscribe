import type { TransformedFrame } from "@jiscribe/geometry";

import type { ObjectRecord } from "./objectAccess";
import { type DocDefinitions, getObjectBounds } from "./objectGeometry";
import { readDocTransform } from "../../model/objects/utils/readDocTransform";

/**
 * The frame a doc object is drawn in: its box centred where the box is, turned
 * and flipped by the doc's own transform fields — the frame the canvas holds for
 * it as its state. A group's child is stored in world coordinates and is framed
 * on its own, the group's turn and flips not composed in, as on the canvas.
 *
 * A shape storing no `height` is framed at the height its text needs, which is
 * measured: the host must have offered a text measurement first (in
 * `@jiscribe/doc-tools`, `offerNodeTextMeasurement()`), or this throws.
 *
 * @param object - Any doc object
 * @param definitions - Type table the box declaration, `features.geometry` and `features.transform` are read from
 * @returns The frame in world coordinates, the angle in degrees and each scale
 *   -1 for a flip and 1 otherwise; null where getObjectBounds finds no box (a
 *   connector, an empty group, a type the table does not know, a
 *   `geometry: "point"` type declaring no box) and for a type without
 *   `features.transform`, whose canvas state carries no transform to frame it by
 */
export const calcObjectTransformedFrame = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): TransformedFrame | null => {
	if (definitions.get(object.type)?.features.transform !== true) {
		return null;
	}
	const bounds = getObjectBounds(object, definitions);
	if (bounds === null) {
		return null;
	}
	return {
		cx: bounds.x + bounds.width / 2,
		cy: bounds.y + bounds.height / 2,
		width: bounds.width,
		height: bounds.height,
		...readDocTransform(object),
	};
};
