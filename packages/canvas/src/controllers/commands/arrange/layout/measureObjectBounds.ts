import { convertBoundingBoxToRect } from "@jiscribe/geometry";
import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calcObjectBoundingBox } from "../../../utils/calcObjectBoundingBox";

/**
 * The axis-aligned box an object occupies as the layout measures it: its geometry
 * box, decoration drawn outside it left out (see calcObjectBoundingBox), or undefined
 * for an object with no extent (an empty group, an unresolvable connector).
 */
export const measureObjectBounds = (
	object: ObjectState,
	objects: Record<string, ObjectState>,
): Rect | undefined => {
	const box = calcObjectBoundingBox(object, objects);
	return box === null ? undefined : convertBoundingBoxToRect(box);
};
