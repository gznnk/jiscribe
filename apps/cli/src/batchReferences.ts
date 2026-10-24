/** The identifier syntax an `as` name takes, as a regular expression source. */
export const BATCH_NAME_SYNTAX = "[A-Za-z_][A-Za-z0-9_]*";

/**
 * What a batch entry's `as` may be: an identifier, so `$name.N` reads back
 * unambiguously.
 */
export const BATCH_NAME_PATTERN = new RegExp(`^${BATCH_NAME_SYNTAX}$`);

/** A whole string that refers to an earlier entry: `$name` or `$name.N`. */
const REFERENCE_PATTERN = new RegExp(
	`^\\$(${BATCH_NAME_SYNTAX})(?:\\.(\\d+))?$`,
);

/** A `$name` in a batch entry's arguments that names nothing usable. */
export class BatchReferenceError extends Error {}

/**
 * Replaces every reference to an earlier entry in one entry's arguments with the
 * id it stands for.
 *
 * Only a string value that is a reference as a whole is replaced, at any depth
 * inside arrays and objects; object keys are left alone. A string starting with
 * `$$` loses one `$` and is not read as a reference, which is how a literal
 * `$name` is written. A string starting with one `$` that is not a reference in
 * form (`$100`, `$a.b`) is left as it is.
 *
 * @param value - The arguments as parsed from JSON; not modified, a copy comes back
 * @param createdIdsByName - Each earlier `as` name and the ids its entry created, in creation order; `$name` is index 0, `$name.N` index N
 * @throws BatchReferenceError when a reference names no earlier entry, its entry created nothing, or its index is out of range
 */
export const resolveBatchReferences = (
	value: unknown,
	createdIdsByName: ReadonlyMap<string, readonly string[]>,
): unknown => {
	if (typeof value === "string") {
		return resolveString(value, createdIdsByName);
	}
	if (Array.isArray(value)) {
		return value.map((element) =>
			resolveBatchReferences(element, createdIdsByName),
		);
	}
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([key, propertyValue]) => [
				key,
				resolveBatchReferences(propertyValue, createdIdsByName),
			]),
		);
	}
	return value;
};

const resolveString = (
	text: string,
	createdIdsByName: ReadonlyMap<string, readonly string[]>,
): string => {
	if (text.startsWith("$$")) {
		return text.slice(1);
	}
	const match = REFERENCE_PATTERN.exec(text);
	if (match === null) {
		return text;
	}
	const [, name, indexText] = match;
	const createdIds = createdIdsByName.get(name);
	if (createdIds === undefined) {
		throw new BatchReferenceError(
			`${text} names no earlier entry: name an entry with "as" to refer to it from the entries after it (write $$ for a literal $)`,
		);
	}
	if (createdIds.length === 0) {
		throw new BatchReferenceError(
			`${text} refers to an entry that created no objects`,
		);
	}
	const index = indexText === undefined ? 0 : Number(indexText);
	if (index >= createdIds.length) {
		throw new BatchReferenceError(
			`${text} is out of range: $${name} created ${createdIds.length} object(s), so its index runs from 0 to ${createdIds.length - 1}`,
		);
	}
	return createdIds[index];
};
