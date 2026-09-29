import { isCssSafeValue, isNumber, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";

/**
 * How one field's value is checked at the doc boundary: the diagnostics the
 * value written at `path` yields, empty when it is admissible.
 */
export type DocFieldValidator = (
	value: unknown,
	path: string,
) => SemanticDiagnostic[];

/**
 * Validator for a value used as a color. Only CSS-injection safety is asked
 * here: whether the string names a color at all needs the browser's parser,
 * which this layer cannot reach, and is asked at the paste boundary instead
 * (`isValidColorValue`).
 */
export const colorValidator: DocFieldValidator = (value, path) =>
	isCssSafeValue(value)
		? []
		: [
				{
					path,
					message: "must be a safe CSS color value",
					severity: "error",
					beyondSchema: true,
				},
			];

/**
 * Builds a validator for a string inlined into a CSS declaration.
 *
 * @param cssProperty - The property the value lands in ("font-family"), which the diagnostic quotes
 * @returns A validator rejecting anything that could break out of that declaration
 */
export const cssValueValidator =
	(cssProperty: string): DocFieldValidator =>
	(value, path) =>
		isCssSafeValue(value)
			? []
			: [
					{
						path,
						message: `must be a safe CSS ${cssProperty} value`,
						severity: "error",
						beyondSchema: true,
					},
				];

/**
 * Builds a validator for a numeric field.
 *
 * @param min - Lower bound, inclusive — the schema's `minimum` for the field; omitted leaves the number unbounded
 * @returns A validator rejecting non-numbers ("must be a number") and values below the bound ("must be >= min")
 */
export const numberValidator =
	(min?: number): DocFieldValidator =>
	(value, path) => {
		if (!isNumber(value)) {
			return [{ path, message: "must be a number", severity: "error" }];
		}
		if (min !== undefined && value < min) {
			return [{ path, message: `must be >= ${min}`, severity: "error" }];
		}
		return [];
	};

/**
 * Builds a validator for a numeric field bounded at both ends.
 *
 * @param min - Smallest admissible value, inclusive
 * @param max - Largest admissible value, inclusive
 * @returns A validator whose single diagnostic names both ends, a non-number failing it like an out-of-range one
 */
export const numberRangeValidator =
	(min: number, max: number): DocFieldValidator =>
	(value, path) =>
		isNumber(value) && value >= min && value <= max
			? []
			: [
					{
						path,
						message: `must be a number between ${min} and ${max}`,
						severity: "error",
					},
				];

/**
 * Validator for a field written as plain text.
 *
 * @param value - The value written for the field
 * @param path - Diagnostic path of the field
 * @returns One diagnostic for anything but a string
 */
export const stringValidator: DocFieldValidator = (value, path) =>
	isString(value)
		? []
		: [{ path, message: "must be a string", severity: "error" }];

/**
 * Builds a validator for a field limited to a known set of values.
 *
 * @param isValid - The set's own type guard (`isStrokeDashType`, ...)
 * @param message - Diagnostic text, which spells the admissible values out
 * @returns A validator yielding that one diagnostic when the guard rejects
 */
export const enumValidator =
	(isValid: (value: unknown) => boolean, message: string): DocFieldValidator =>
	(value, path) =>
		isValid(value) ? [] : [{ path, message, severity: "error" }];

/**
 * Validates the fields of one group, each against the validator the group's
 * table gives it. The state layer keys a table of its own by the same type, so a
 * field a group gains has to be given a validator on both sides or fails to
 * compile on both (validateStateUtils).
 *
 * @param o - The object carrying the group's fields; keys outside the table are ignored
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @param validators - The group's table, whose key order the diagnostics follow
 * @returns One diagnostic per malformed field; a field that is absent or `undefined` is unspecified and yields none
 */
export const validateFields = (
	o: Record<string, unknown>,
	path: string,
	validators: Readonly<Record<string, DocFieldValidator>>,
): SemanticDiagnostic[] =>
	Object.entries(validators).flatMap(([key, validate]) =>
		o[key] === undefined ? [] : validate(o[key], `${path}.${key}`),
	);
