import { AWS_ICON_ALIASES } from "./iconAliases";
import { AWS_ICON_ENTRIES } from "./iconData.generated";
import { normalizeAwsIconName } from "./normalizeAwsIconName";

/** How many candidates before the message turns from help into nagging. */
const MAX_SUGGESTIONS = 3;

/** Beyond this edit distance a name is a different one, not a typo. */
const MAX_EDIT_DISTANCE = 3;

/** Splits a name into words, the layer separator `/` counting as one too. */
const splitWords = (name: string): string[] =>
	name.split(/[/-]/).filter((word) => word !== "");

/**
 * Names the icon a caller probably meant by a name that does not exist, likeliest
 * first.
 *
 * Three ways of missing are tried in turn and only the first kind that answers
 * is offered — mixing a weak kind in dilutes a strong one:
 *
 * 1. **The right words, the wrong layer or order.** A forgotten layer
 *    (`ec2/instance`), a swapped order (`lambda-aws`). Matching on the set of
 *    words makes this the surest kind
 * 2. **A typo.** Within {@link MAX_EDIT_DISTANCE} edits
 * 3. **A word short.** There is no `vpc/gateway` but there is
 *    `amazon-vpc/internet-gateway`; the fewer words to add, the likelier
 *
 * @param name - the name as written; it is normalized first, so a difference of
 *   case or separator never throws the comparison off
 * @returns up to {@link MAX_SUGGESTIONS} canonical names, likeliest first, or an
 *   empty array when nothing resembles it
 */
export const suggestAwsIconNames = (name: string): string[] => {
	const normalized = normalizeAwsIconName(name);
	if (normalized === "") {
		return [];
	}

	const candidates =
		pickOthers(findNamesWithSameWords(normalized), normalized) ??
		pickOthers(findNearestNames(normalized), normalized) ??
		pickOthers(findNamesAddingWords(normalized), normalized) ??
		[];
	return candidates.slice(0, MAX_SUGGESTIONS);
};

/** Names indexed by their set of words. Built on first use. */
let namesByWordSet: Map<string, string[]> | null = null;

const wordSetKey = (name: string): string =>
	[...new Set(splitWords(name))].sort().join("-");

const readNamesByWordSet = (): Map<string, string[]> => {
	if (namesByWordSet === null) {
		namesByWordSet = new Map();
		// Alias spellings go in too, so a short name written with its words out of
		// order still lands.
		const searchable = [
			...Object.keys(AWS_ICON_ENTRIES).map((entryName) => ({
				key: entryName,
				target: entryName,
			})),
			...Object.entries(AWS_ICON_ALIASES).map(([alias, target]) => ({
				key: alias,
				target,
			})),
		];
		for (const { key, target } of searchable) {
			const bucket = namesByWordSet.get(wordSetKey(key));
			if (bucket === undefined) {
				namesByWordSet.set(wordSetKey(key), [target]);
			} else if (!bucket.includes(target)) {
				bucket.push(target);
			}
		}
	}
	return namesByWordSet;
};

const findNamesWithSameWords = (normalized: string): readonly string[] =>
	readNamesByWordSet().get(wordSetKey(normalized)) ?? [];

/** null says that round found nothing; the written name itself is never a candidate. */
const pickOthers = (
	candidates: readonly string[],
	normalized: string,
): string[] | null => {
	const others = candidates.filter((candidate) => candidate !== normalized);
	return others.length === 0 ? null : others;
};

/** Names within {@link MAX_EDIT_DISTANCE} edits, nearest first then alphabetically. */
const findNearestNames = (normalized: string): string[] =>
	Object.keys(AWS_ICON_ENTRIES)
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

/** Names holding every written word and more, fewest added words first. */
const findNamesAddingWords = (normalized: string): string[] => {
	const words = new Set(splitWords(normalized));
	return Object.keys(AWS_ICON_ENTRIES)
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
 * Levenshtein distance, abandoned as soon as exceeding `max` is settled.
 *
 * @param left - one of the names; the order of the two does not affect the result
 * @param right - the other name
 * @param max - the largest distance worth knowing, 0 or more
 * @returns the distance, or null once it is settled to exceed `max`
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
		(_unused, index) => index,
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
		// No later row goes below this row's minimum, so the answer only grows.
		if (rowMinimum > max) {
			return null;
		}
		previousRow = currentRow;
	}

	const distance = previousRow[right.length];
	return distance > max ? null : distance;
};
