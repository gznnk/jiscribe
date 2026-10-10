import type { ResolvedShapeStyle } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ShapeStyleField } from "../../utils/pickShapeStyleFields";
import { pickShapeStyleFields } from "../../utils/pickShapeStyleFields";
import type { StyleEntry } from "../StyleEntry";

/**
 * An intent stored as one field of the object itself — the plain case, which is
 * what the core types do with their stroke, fill, corner radius and arrowheads.
 *
 * Only the shape-style fields are accepted: `read` resolves through
 * ObjectShapeStyleDefaultsRegistry, which is what makes an object stating
 * nothing report what it is drawn with, and that registry answers for those
 * fields alone (a color a type declares for itself takes `declaredFieldEntry`
 * instead, which has no defaults to resolve through). Naming the field is also
 * what fixes the value type, so a field and an intent that disagree about it do
 * not compile.
 *
 * @param field - The field written and read; one the shape-style defaults answer for, whose own type is the entry's value type
 * @returns The pair, writing `value` as-is and reporting one value per object
 * @template TState - The state the entry is written against; `ObjectState` unless named, which is what a type writing its own state does
 * @template F - The field, which decides the value type
 */
export const objectFieldEntry = <
	TState extends ObjectState,
	F extends ShapeStyleField,
>(
	field: F,
): StyleEntry<TState, ResolvedShapeStyle[F]> => ({
	apply: (object, _pick, value) =>
		Object.is((object as unknown as Record<string, unknown>)[field], value)
			? object
			: ({ ...object, [field]: value } as TState),
	read: (object, _pick, ctx) => [
		ctx.shapeStyleDefaults.resolveShapeStyle(
			object.type,
			pickShapeStyleFields(object),
		)[field],
	],
});
