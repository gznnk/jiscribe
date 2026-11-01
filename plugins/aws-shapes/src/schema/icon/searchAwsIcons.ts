import { AWS_ICON_ALIASES } from "./iconAliases";
import { AWS_ICON_ENTRIES } from "./iconData.generated";
import { normalizeAwsIconName } from "./normalizeAwsIconName";
import { AWS_TIER1_ICON_NAMES } from "./tier1Icons";

/** What to search the set for. */
export type AwsIconFilter = {
	/** The search term, in any spelling normalizeAwsIconName accepts. Empty shows the palette */
	query: string;
};

/** A search result. `total` is the count before truncation, for a "more matched" line. */
export type AwsIconSearchResult = {
	names: string[];
	total: number;
};

/** How many are laid out at once. Past this, narrowing the search is quicker than scrolling. */
const MAX_RESULTS = 105;

/** Canonical name to its alias spellings; one name may go by several short ones. */
const ALIASES_BY_NAME = new Map<string, string[]>();
for (const [alias, target] of Object.entries(AWS_ICON_ALIASES)) {
	ALIASES_BY_NAME.set(target, [...(ALIASES_BY_NAME.get(target) ?? []), alias]);
}

/**
 * The names a search for the term lays out. The term is tried against the name,
 * the display label, the aliases and the AWS category, and a prefix match sorts
 * above a substring one, a short name above a long one.
 *
 * An empty term (or one that normalizes to nothing) shows tier 1, in the
 * palette's order: laying out all 781 to begin with is not something anyone
 * chooses from.
 *
 * @param filter - the term to search for
 * @returns the canonical names to show (at most {@link MAX_RESULTS}) and the
 *   count before truncation
 */
export const searchAwsIcons = (filter: AwsIconFilter): AwsIconSearchResult => {
	const needle = normalizeAwsIconName(filter.query);
	const matched =
		needle === ""
			? [...AWS_TIER1_ICON_NAMES]
			: sortByRelevance(findMatches(needle), needle);
	return { names: matched.slice(0, MAX_RESULTS), total: matched.length };
};

/**
 * The names whose own name, label, alias or AWS category holds the term. The category
 * lets a term stand in for a category, as in the stencil library's search
 * ("compute" lists all of Compute).
 */
const findMatches = (needle: string): string[] =>
	Object.entries(AWS_ICON_ENTRIES)
		.filter(
			([name, entry]) =>
				name.includes(needle) ||
				normalizeAwsIconName(entry.label).includes(needle) ||
				normalizeAwsIconName(entry.category).includes(needle) ||
				(ALIASES_BY_NAME.get(name) ?? []).some((alias) =>
					alias.includes(needle),
				),
		)
		.map(([name]) => name);

/** Prefix matches first, then shortest, then alphabetical. */
const sortByRelevance = (names: string[], needle: string): string[] =>
	[...names].sort(
		(left, right) =>
			Number(startsWithNeedle(right, needle)) -
				Number(startsWithNeedle(left, needle)) ||
			left.length - right.length ||
			left.localeCompare(right),
	);

/** Whether the name starts with the term with or without its layer prefix (or `service/` would miss every time). */
const startsWithNeedle = (name: string, needle: string): boolean =>
	name.startsWith(needle) ||
	name.slice(name.indexOf("/") + 1).startsWith(needle);
