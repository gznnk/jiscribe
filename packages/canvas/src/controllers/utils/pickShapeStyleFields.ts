import { isNumber, isString } from "@jiscribe/basic-validators";
import { isArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { isStrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { ResolvedShapeStyle } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";

import type { ObjectState } from "../../states/objects/base/ObjectState";

/** A shape-style field: the set the shape-style defaults answer for. */
export type ShapeStyleField = keyof ResolvedShapeStyle & string;

/** The type each shape-style field carries, by which a state is held to it. */
const SHAPE_STYLE_FIELD_GUARDS: Record<
	ShapeStyleField,
	(value: unknown) => boolean
> = {
	stroke: isString,
	strokeWidth: isNumber,
	strokeDashType: isStrokeDashType,
	strokeOpacity: isNumber,
	fill: isString,
	fillOpacity: isNumber,
	rx: isNumber,
	startArrow: isArrowType,
	endArrow: isArrowType,
};

/**
 * One object's shape-style fields, in the shape
 * `ObjectShapeStyleDefaultsRegistry.resolveShapeStyle` takes them: a field
 * holding the wrong type is dropped rather than passed on, so resolution takes
 * over for it the way it does for one left unset.
 *
 * The single place the style fields are read off an ObjectState, which is why
 * the cast to a bag of unknown values lives here — every side that resolves a
 * shape style goes through it, and so holds the state to the same types.
 *
 * @param object - The object to read; one carrying none of the fields yields an empty bag
 * @returns The fields it sets, each already checked; nothing is resolved here
 */
export const pickShapeStyleFields = (
	object: ObjectState,
): Partial<ResolvedShapeStyle> => {
	const own = object as unknown as Record<string, unknown>;
	const picked: Record<string, unknown> = {};
	for (const [field, isValid] of Object.entries(SHAPE_STYLE_FIELD_GUARDS)) {
		if (isValid(own[field])) {
			picked[field] = own[field];
		}
	}
	return picked as Partial<ResolvedShapeStyle>;
};
