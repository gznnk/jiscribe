import type { ExtraStyleEntry, StyleTable } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The entry a type's table holds under one kind. A table is an object literal,
 * so a name of `Object.prototype` reaches a member of it that is no entry at
 * all; looked up as an own key, such a name is a kind the table does not hold.
 *
 * @param table - The addressed type's table, undefined for a type with none registered
 * @param kind - The intent kind, as the surface that raised it spelled it; any string, a prototype's name included
 * @returns The entry, or undefined when the table is absent or holds no such own key
 */
export const styleEntryOf = (
	table: StyleTable<ObjectState> | undefined,
	kind: string,
): ExtraStyleEntry | undefined =>
	// Not `Object.hasOwn`: a host typechecking these sources may pin a lib below ES2022.
	table !== undefined && Object.prototype.hasOwnProperty.call(table, kind)
		? table[kind]
		: undefined;
