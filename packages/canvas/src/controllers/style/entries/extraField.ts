import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { coerceStyleValue } from "../coerceStyleValue";
import type { StyleEntry } from "../StyleEntry";

/**
 * Immutably writes `value` at `path` ("label.fill" → ["label", "fill"]).
 * Returns null when an intermediate parent is missing or not a plain object —
 * nested writes merge into existing parents and never fabricate them.
 */
const writeAtPath = (
	target: Record<string, unknown>,
	path: readonly string[],
	value: unknown,
): Record<string, unknown> | null => {
	const [head, ...rest] = path;
	if (rest.length === 0) {
		return { ...target, [head]: value };
	}
	const child = target[head];
	if (typeof child !== "object" || child === null || Array.isArray(child)) {
		return null;
	}
	const updatedChild = writeAtPath(
		child as Record<string, unknown>,
		rest,
		value,
	);
	return updatedChild === null ? null : { ...target, [head]: updatedChild };
};

/**
 * The value at `path`, or undefined when any step of it is absent — the read
 * side of `writeAtPath`, which never fabricates what it walks through either.
 */
const readAtPath = (
	target: Record<string, unknown>,
	path: readonly string[],
): unknown =>
	path.reduce<unknown>(
		(parent, key) => (parent as Record<string, unknown> | undefined)?.[key],
		target,
	);

/**
 * An intent a shape declares for itself (ExtraStyleProperties): the engine knows
 * neither what it means nor what it is for, only where the declaration says it
 * lands and how to read the value.
 *
 * The value arrives as the transport string the menus carry and is read with the
 * declared `valueType` here rather than at the boundary, since the boundary
 * cannot know a plugin's own vocabulary. A string no number can be made of
 * applies nothing, the way it always did.
 *
 * @param path - The field written and read, a dotted name split up ("label.fill" → ["label", "fill"]); a nested write merges into the existing parent and answers null when there is none, so an extra under a part the object does not carry (a connector with no label) applies to nothing
 * @param valueType - What the transport string is read as (coerceStyleValue), as the declaration states it
 * @returns The pair, writing the value read and reporting the stored one per object — undefined where the object states nothing, the type declaring the field being what makes the intent reach it at all
 * @template TState - The state the entry is written against
 */
export const extraField = <TState extends ObjectState>(
	path: readonly string[],
	valueType: StyleValueType,
): StyleEntry<TState, string> => ({
	apply: (object, _pick, value) => {
		const coerced = coerceStyleValue(valueType, value);
		if (coerced === null) {
			return null;
		}
		const fields = object as unknown as Record<string, unknown>;
		if (Object.is(readAtPath(fields, path), coerced)) {
			return object;
		}
		return writeAtPath(fields, path, coerced) as TState | null;
	},
	read: (object) => [
		readAtPath(object as unknown as Record<string, unknown>, path) as string,
	],
});
