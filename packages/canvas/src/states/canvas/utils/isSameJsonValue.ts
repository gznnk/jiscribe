type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isSameJsonRecord = (
	left: JsonRecord,
	right: JsonRecord,
	ignoredKey: string | undefined,
): boolean => {
	// Counted rather than collected: this runs once per object of a document on
	// every external sync, so it allocates nothing.
	let leftKeyCount = 0;
	for (const key in left) {
		if (key === ignoredKey || left[key] === undefined) {
			continue;
		}
		if (!Object.hasOwn(right, key) || !isSameJsonValue(left[key], right[key])) {
			return false;
		}
		leftKeyCount += 1;
	}
	let rightKeyCount = 0;
	for (const key in right) {
		if (key !== ignoredKey && right[key] !== undefined) {
			rightKeyCount += 1;
		}
	}
	return leftKeyCount === rightKeyCount;
};

/**
 * Whether two values hold the same JSON, key order aside: a document read from
 * a file and the same document written by the canvas spell an object's keys in
 * different orders. A key holding `undefined` counts as absent, as it does once
 * serialized.
 *
 * @param left - A JSON value (what `JSON.parse` returns, or a doc built in memory)
 * @param right - The value to compare it with; which side is which does not matter
 * @returns True for structurally equal values; `0` and `-0` compare equal, as
 *   they serialize the same
 */
export const isSameJsonValue = (left: unknown, right: unknown): boolean => {
	if (left === right) {
		return true;
	}
	if (Array.isArray(left) || Array.isArray(right)) {
		if (
			!Array.isArray(left) ||
			!Array.isArray(right) ||
			left.length !== right.length
		) {
			return false;
		}
		for (let index = 0; index < left.length; index += 1) {
			if (!isSameJsonValue(left[index], right[index])) {
				return false;
			}
		}
		return true;
	}
	if (!isJsonRecord(left) || !isJsonRecord(right)) {
		return false;
	}
	return isSameJsonRecord(left, right, undefined);
};

/**
 * {@link isSameJsonValue} for two records with one top-level key left out of
 * the comparison, without copying either: a group's own fields, its `children`
 * aside.
 *
 * @param left - A JSON record
 * @param right - The record to compare it with
 * @param ignoredKey - The key skipped on both sides, at the top level only
 */
export const isSameJsonFieldsExcept = (
	left: object,
	right: object,
	ignoredKey: string,
): boolean =>
	isSameJsonRecord(left as JsonRecord, right as JsonRecord, ignoredKey);
