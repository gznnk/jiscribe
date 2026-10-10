/**
 * What a style value a type declares for itself is read as. The core intents
 * carry their types in the vocabulary (CoreStyleIntent), so these three are the
 * whole of what a declaration may name — and so the whole of what a transport
 * string can be read into.
 */
export type StyleValueType = "string" | "number" | "boolean";

/**
 * The value type one {@link StyleValueType} names, which is what an entry
 * declared with it works in (declaredFieldEntry).
 *
 * @template TValueType - The declared type name
 */
export type StyleValueOfType<TValueType extends StyleValueType> =
	TValueType extends "number"
		? number
		: TValueType extends "boolean"
			? boolean
			: string;

/**
 * The one reading of a style value's transport form. Every value a menu part
 * carries is a string (`set:fontSize:24`), and what that string is read as is
 * whatever the receiving side declares: a type's own `valueType`
 * (declaredFieldEntry) or the intent's own type at the boundary
 * (toStyleIntent).
 *
 * @param valueType - The type to read the string as
 * @param value - The transport string, as the menus' parts spell it
 * @returns The value read, or null when a number does not parse — the caller's
 *   cue to apply nothing. A boolean is true for `"true"` alone, any other
 *   spelling being false, and a string is handed back as it stands
 */
export const coerceStyleValue = (
	valueType: StyleValueType,
	value: string,
): string | number | boolean | null => {
	if (valueType === "number") {
		const parsed = Number(value);
		return isNaN(parsed) ? null : parsed;
	}
	if (valueType === "boolean") {
		return value === "true";
	}
	return value;
};
