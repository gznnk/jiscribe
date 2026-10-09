import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StyleValueOfType, StyleValueType } from "../coerceStyleValue";
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
 * Whether every parent on the way to the field is there — the same walk
 * `writeAtPath` refuses to fabricate, asked as a question. A plain object is the
 * only thing it merges into, so an array or a primitive is no parent either.
 */
const hasParentsOnPath = (
	target: Record<string, unknown>,
	path: readonly string[],
): boolean => {
	let parent: unknown = target;
	for (const key of path.slice(0, -1)) {
		if (
			typeof parent !== "object" ||
			parent === null ||
			Array.isArray(parent)
		) {
			return false;
		}
		parent = (parent as Record<string, unknown>)[key];
	}
	return (
		typeof parent === "object" && parent !== null && !Array.isArray(parent)
	);
};

/**
 * The incoming value as the declared type, or null for one nothing of that type
 * can be made of. A value already of it is taken as it stands — a row holding
 * the declaration states its value typed — and a string is read as the
 * transport form it is (`coerceStyleValue`), which is all the DOM route can
 * carry. Anything else is neither.
 */
const readDeclaredValue = <TValueType extends StyleValueType>(
	valueType: TValueType,
	value: unknown,
): StyleValueOfType<TValueType> | null => {
	// The three names a declaration may use are `typeof`'s own (StyleValueType),
	// so the check is the comparison; the kind stays generic, hence the cast.
	if (typeof value === valueType) {
		return value as StyleValueOfType<TValueType>;
	}
	if (typeof value !== "string") {
		return null;
	}
	return coerceStyleValue(
		valueType,
		value,
	) as StyleValueOfType<TValueType> | null;
};

/**
 * An intent stored as one field of the type's own data — the field a type names
 * when it declares a style no `ObjectFeatures` flag covers (a container's
 * `headerFill`, a connector's `label.fill`). The engine knows neither what the
 * kind means nor what it is for, only where the declaration says it lands and
 * what type it holds.
 *
 * A field of the shape-style vocabulary (stroke / fill / radius / arrow) takes
 * `objectField` instead, which resolves its `read` through the type's defaults;
 * this one reports what the object states and nothing more, there being no
 * defaults for a type's own field to resolve through.
 *
 * @param path - The field written and read: a dotted name ("label.fill"), split here, or its parts spelled out. A nested write merges into the existing parent and answers null when there is none, so a kind under a part the object does not carry (a connector with no label) applies to nothing
 * @param valueType - What the field holds, which fixes the entry's value type; an incoming value is read against it (readDeclaredValue)
 * @returns The pair, writing the value read and reporting the stored one per object — `undefined` where the object states nothing, and no value at all where a parent on the path is missing, matching what `apply` would reach
 * @template TState - The state the entry is written against; left out, it is written against every object, which is what a kind outside the core vocabulary needs (StyleTable)
 * @template TValueType - The declared type, which fixes the value type
 */
export const fieldEntry = <
	TState extends ObjectState,
	TValueType extends StyleValueType,
>(
	path: string | readonly string[],
	valueType: TValueType,
): StyleEntry<TState, StyleValueOfType<TValueType> | undefined> => {
	const parts = typeof path === "string" ? path.split(".") : path;
	return {
		// The root of the path is the one field a write touches, whatever depth it
		// lands at: a nested write copies that parent rather than reaching past it.
		fields: [parts[0]],
		apply: (object, _pick, value) => {
			const declared = readDeclaredValue(valueType, value);
			if (declared === null) {
				return null;
			}
			const fields = object as unknown as Record<string, unknown>;
			if (Object.is(readAtPath(fields, parts), declared)) {
				return object;
			}
			return writeAtPath(fields, parts, declared) as TState | null;
		},
		read: (object) => {
			const fields = object as unknown as Record<string, unknown>;
			// No parent to merge into means a write applies to nothing, so the field is
			// not one of this object's: a row states the value of exactly the objects a
			// write would reach. The field's own absence is a value (unset).
			if (!hasParentsOnPath(fields, parts)) {
				return [];
			}
			return [
				readAtPath(fields, parts) as StyleValueOfType<TValueType> | undefined,
			];
		},
	};
};
