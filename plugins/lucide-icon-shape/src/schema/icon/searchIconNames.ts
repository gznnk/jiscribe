import { ICON_ALIASES, ICON_NODES } from "./iconData.generated";
import { normalizeIconName } from "./normalizeIconName";

/**
 * How many results a search hands back. The whole set is far too large to lay out at
 * once, and a query narrow enough to be useful lands well inside this; `total` says when
 * it did not, so a wider query is visibly the answer rather than more scrolling.
 */
const MAX_RESULTS = 96;

/**
 * Names matching `query`, best first: the ones starting with it before the ones merely
 * containing it, and shorter before longer so `lock` precedes `lock-keyhole-open`.
 *
 * Superseded names are searched too — someone typing the name they know should still find
 * the icon — but what comes back is always the current name, which is what gets written.
 *
 * @param query - Any spelling {@link normalizeIconName} accepts; one that normalizes to nothing matches nothing
 * @returns Up to 96 current names in rank order, and how many matched before the cut
 */
export const searchIconNames = (
	query: string,
): { names: string[]; total: number } => {
	const needle = normalizeIconName(query);
	if (needle === "") {
		return { names: [], total: 0 };
	}

	const prefixMatches = new Set<string>();
	const otherMatches = new Set<string>();
	for (const { searchedName, currentName } of readSearchIndex()) {
		if (searchedName.includes(needle)) {
			(currentName.startsWith(needle) ? prefixMatches : otherMatches).add(
				currentName,
			);
		}
	}
	const matched = [...prefixMatches, ...otherMatches];
	return { names: matched.slice(0, MAX_RESULTS), total: matched.length };
};

/** A spelling a search matches against, with the current name it answers with. */
type SearchIndexEntry = {
	/** A current name, or a superseded one. */
	searchedName: string;
	/** The name a match hands back: the spelling itself, or what it was renamed to. */
	currentName: string;
};

/**
 * Every current and superseded name, ordered by the current name: shortest first,
 * then alphabetically. Built on first use, then kept, as the library searches on
 * every keystroke.
 */
let searchIndex: SearchIndexEntry[] | null = null;

const readSearchIndex = (): SearchIndexEntry[] => {
	if (searchIndex === null) {
		searchIndex = [
			...Object.keys(ICON_NODES).map((name) => ({
				searchedName: name,
				currentName: name,
			})),
			...Object.entries(ICON_ALIASES).map(([formerName, currentName]) => ({
				searchedName: formerName,
				currentName,
			})),
		].sort(
			(left, right) =>
				left.currentName.length - right.currentName.length ||
				left.currentName.localeCompare(right.currentName),
		);
	}
	return searchIndex;
};
