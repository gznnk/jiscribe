import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";

/**
 * The one reading of a style value's transport form. Every value a menu part
 * carries is a string (`set:fontSize:24`), and what that string is read as is
 * whatever the receiving side declares: a shape's own `valueType` (extraField)
 * or the intent's own type at the boundary (applyStyleProperty).
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
