import { ICON_NODES } from "./iconData.generated";
import { normalizeIconName } from "./normalizeIconName";

/** How many candidates a message is willing to offer before it stops helping and starts nagging. */
const MAX_SUGGESTIONS = 3;

/** Edits allowed before two names count as unrelated rather than mistyped. */
const MAX_EDIT_DISTANCE = 2;

/**
 * Names whose words match a written name's, keyed by those words sorted and joined.
 * Built on first use and only ever consulted for a name that already failed to
 * resolve, so a document full of valid names never pays for it.
 */
let namesByWordSet: Map<string, string[]> | null = null;

const splitWords = (name: string): string[] =>
	name.split("-").filter((word) => word !== "");

const wordSetKey = (name: string): string =>
	[...new Set(splitWords(name))].sort().join("-");

const readNamesByWordSet = (): Map<string, string[]> => {
	if (namesByWordSet === null) {
		namesByWordSet = new Map();
		for (const name of Object.keys(ICON_NODES)) {
			const key = wordSetKey(name);
			const bucket = namesByWordSet.get(key);
			if (bucket === undefined) {
				namesByWordSet.set(key, [name]);
			} else {
				bucket.push(name);
			}
		}
	}
	return namesByWordSet;
};

/**
 * Proposes replacements for an icon name that does not exist, best first, so the
 * message reporting the name can say what was probably meant.
 *
 * Three kinds of near-miss are looked for, and the first kind to find anything is the
 * answer — a weaker kind's guesses would only dilute a stronger one's:
 *
 * 1. **The same words in another order.** The icon set renamed a whole family to put
 *    the noun first (`user-circle` → `circle-user`); a name learned before that matches
 *    word for word and nowhere else, which makes it as good as certain.
 * 2. **A typo.** Up to {@link MAX_EDIT_DISTANCE} edits away, which also covers a lost
 *    separator (`trash2` → `trash-2`).
 * 3. **A name missing a word.** `chevron` cannot be drawn, but `chevron-up` can, and
 *    the fewer words a candidate adds the likelier it is the one wanted.
 *
 * @param name - The name as written; normalized first, so the comparison is not thrown
 *   off by casing or separators
 * @returns At most {@link MAX_SUGGESTIONS} current names, most likely first; empty when
 *   the name resembles nothing in the set
 */
export const suggestIconNames = (name: string): string[] => {
	const normalized = normalizeIconName(name);
	if (normalized === "") {
		return [];
	}

	const reordered = readNamesByWordSet().get(wordSetKey(normalized)) ?? [];
	const candidates =
		pickOthers(reordered, normalized) ??
		pickOthers(findNearestNames(normalized), normalized) ??
		pickOthers(findNamesAddingWords(normalized), normalized) ??
		[];
	return candidates.slice(0, MAX_SUGGESTIONS);
};

/**
 * Drops the written name from a pass's candidates, and reports the pass as having
 * found nothing when that is all it had.
 */
const pickOthers = (
	candidates: readonly string[],
	normalized: string,
): string[] | null => {
	const others = candidates.filter((candidate) => candidate !== normalized);
	return others.length === 0 ? null : others;
};

/** Names within {@link MAX_EDIT_DISTANCE} edits, closest first and alphabetical within a distance. */
const findNearestNames = (normalized: string): string[] =>
	Object.keys(ICON_NODES)
		.map((candidate) => ({
			candidate,
			distance: calcEditDistance(normalized, candidate, MAX_EDIT_DISTANCE),
		}))
		.filter(({ distance }) => distance !== null)
		.sort(
			(left, right) =>
				(left.distance ?? 0) - (right.distance ?? 0) ||
				left.candidate.localeCompare(right.candidate),
		)
		.map(({ candidate }) => candidate);

/** Names holding every word of the written name plus at least one more, fewest extras first. */
const findNamesAddingWords = (normalized: string): string[] => {
	const words = new Set(splitWords(normalized));
	return Object.keys(ICON_NODES)
		.map((candidate) => ({ candidate, words: splitWords(candidate) }))
		.filter(
			({ words: candidateWords }) =>
				candidateWords.length > words.size &&
				[...words].every((word) => candidateWords.includes(word)),
		)
		.sort(
			(left, right) =>
				left.words.length - right.words.length ||
				left.candidate.localeCompare(right.candidate),
		)
		.map(({ candidate }) => candidate);
};

/**
 * Levenshtein distance, abandoned as soon as it is known to exceed `max`.
 *
 * @param left - One name; the argument order does not affect the result
 * @param right - The other name
 * @param max - Largest distance worth knowing; ≥ 0
 * @returns The distance, or null once it is certain to be above `max`
 */
const calcEditDistance = (
	left: string,
	right: string,
	max: number,
): number | null => {
	if (Math.abs(left.length - right.length) > max) {
		return null;
	}

	let previousRow = Array.from(
		{ length: right.length + 1 },
		(_, index) => index,
	);
	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		const currentRow = [leftIndex];
		let rowMinimum = leftIndex;
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
			const substitution =
				previousRow[rightIndex - 1] +
				(left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
			const distance = Math.min(
				substitution,
				previousRow[rightIndex] + 1,
				currentRow[rightIndex - 1] + 1,
			);
			currentRow.push(distance);
			rowMinimum = Math.min(rowMinimum, distance);
		}
		// Every later row is at least this row's minimum, so the answer can only grow.
		if (rowMinimum > max) {
			return null;
		}
		previousRow = currentRow;
	}

	const distance = previousRow[right.length];
	return distance > max ? null : distance;
};
