import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { isSystemStyleName } from "./applyStyleProperty";
import { extraField } from "./entries/extraField";
import type { ExtraStyleEntry, StyleTable } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The entries a type gets from its own declarations: one per declared name,
 * landing where the name says (`extraField`) and reading the transport string as
 * the declared `valueType`.
 *
 * Composed onto the derived table (`coreStyleTable`) at registration, which is
 * what makes a declaration reach the walkers the engine's own styles go through —
 * so an extra is written on the declaring objects of a selection, descendants of
 * a selected group included, and on nothing else.
 *
 * @param type - The type the declarations belong to; named in the error a collision raises
 * @param extras - What the type declares, keyed by property name; a type declaring none hands over undefined and gets an empty table
 * @returns The extra half of the type's table
 * @throws When a declared name is one of the engine's own style names: such a
 *   name is read into the intent of that name at the boundary
 *   (applyStyleProperty), so the entry would never be reached and the shadowing
 *   declaration would quietly do nothing
 */
export const extraStyleTable = (
	type: ObjectType,
	extras: Record<string, ExtraStylePropertyDescriptor> | undefined,
): StyleTable<ObjectState> => {
	const table: Record<string, ExtraStyleEntry> = {};
	for (const [property, descriptor] of Object.entries(extras ?? {})) {
		if (isSystemStyleName(property)) {
			throw new Error(
				`extraStyleTable: object type "${type}" declares the extra style property "${property}", which is one of the engine's own style names`,
			);
		}
		table[property] = extraField(property.split("."), descriptor.valueType);
	}
	return table;
};
