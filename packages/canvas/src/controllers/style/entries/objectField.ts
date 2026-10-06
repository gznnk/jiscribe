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
 * fields alone (a shape's own extra color takes `extraField` instead, which has
 * no defaults to resolve through).
 *
 * @param field - The field written and read; one the shape-style defaults answer for
 * @returns The pair, writing `value` as-is and reporting one value per object
 * @template TState - The state the entry is written against
 * @template V - The intent's value type; `field` is expected to carry it
 */
export const objectField = <TState extends ObjectState, V>(
	field: ShapeStyleField,
): StyleEntry<TState, V> => ({
	apply: (object, _pick, value) =>
		Object.is((object as unknown as Record<string, unknown>)[field], value)
			? object
			: ({ ...object, [field]: value } as TState),
	read: (object, _pick, ctx) => [
		ctx.shapeStyleDefaults.resolveShapeStyle(
			object.type,
			pickShapeStyleFields(object),
		)[field] as V,
	],
});
