import type { AwsIconTier } from "../schema/icon/AwsIconNode";
import { AWS_ICON_ALIASES } from "../schema/icon/iconAliases";
import { AWS_ICON_ENTRIES } from "../schema/icon/iconData.generated";
import { normalizeAwsIconName } from "../schema/icon/normalizeAwsIconName";
import { AWS_TIER1_ICON_NAMES } from "../schema/icon/tier1Icons";

/** What the picker filters by. undefined leaves that axis unfiltered. */
export type AwsIconFilter = {
	/** The search term. Empty shows the palette, or all a picked facet holds */
	query: string;
	/** Filter by layer; undefined means every layer */
	tier?: AwsIconTier;
	/** Filter by AWS category; undefined means every category */
	category?: string;
};

/** A search result. `total` is the count before truncation, for the "m of n" line. */
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

/** Whether the name passes the layer and category filters. */
const matchesFacets = (name: string, filter: AwsIconFilter): boolean => {
	const entry = AWS_ICON_ENTRIES[name];
	if (entry === undefined) {
		return false;
	}
	return (
		(filter.tier === undefined || entry.tier === filter.tier) &&
		(filter.category === undefined || entry.category === filter.category)
	);
};

/**
 * The names the picker lays out. The term is tried against the name, the display
 * label and the aliases, and a prefix match sorts above a substring one, a short
 * name above a long one.
 *
 * An empty term with no facet picked shows tier 1, in the palette's order.
 * Laying out all 781 to begin with is not something anyone chooses from, so the
 * reachable ones come first and the search goes down from there. A facet is a
 * choice of its own, so it is answered out of the whole set
 * ({@link listWithoutTerm}).
 *
 * @param filter - the term and the layer / category filters, which AND together
 * @returns the canonical names to show (at most {@link MAX_RESULTS}) and the
 *   count before truncation
 */
export const searchAwsIcons = (filter: AwsIconFilter): AwsIconSearchResult => {
	const needle = normalizeAwsIconName(filter.query);
	const matched =
		needle === ""
			? listWithoutTerm(filter)
			: sortByRelevance(findMatches(needle, filter), needle);
	return { names: matched.slice(0, MAX_RESULTS), total: matched.length };
};

/**
 * What an empty term shows: the palette as it stands, or, once a chip is
 * pressed, every name that chip holds. Tier 1 carries no `group/` icon and
 * nothing from 13 of the categories, so answering a chosen facet out of the
 * palette alone would leave those chips with an empty grid.
 */
const listWithoutTerm = (filter: AwsIconFilter): string[] =>
	filter.tier === undefined && filter.category === undefined
		? [...AWS_TIER1_ICON_NAMES]
		: sortByPaletteFirst(
				Object.keys(AWS_ICON_ENTRIES).filter((name) =>
					matchesFacets(name, filter),
				),
			);

/** Where a name sits in the palette; the ones outside it share the rank past its end. */
const PALETTE_RANK_BY_NAME = new Map(
	AWS_TIER1_ICON_NAMES.map((name, index) => [name, index]),
);

/** Palette members first in the palette's order, then the rest alphabetically. */
const sortByPaletteFirst = (names: string[]): string[] =>
	[...names].sort(
		(left, right) =>
			paletteRank(left) - paletteRank(right) || left.localeCompare(right),
	);

/** The palette position, or one past its end for a name it does not carry. */
const paletteRank = (name: string): number =>
	PALETTE_RANK_BY_NAME.get(name) ?? AWS_TIER1_ICON_NAMES.length;

/** The names whose own name, label or alias holds the term. */
const findMatches = (needle: string, filter: AwsIconFilter): string[] =>
	Object.entries(AWS_ICON_ENTRIES)
		.filter(
			([name, entry]) =>
				matchesFacets(name, filter) &&
				(name.includes(needle) ||
					normalizeAwsIconName(entry.label).includes(needle) ||
					(ALIASES_BY_NAME.get(name) ?? []).some((alias) =>
						alias.includes(needle),
					)),
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

/** The AWS categories the filter chips list: the ones that exist, alphabetically. */
export const AWS_ICON_CATEGORIES: readonly string[] = [
	...new Set(Object.values(AWS_ICON_ENTRIES).map((entry) => entry.category)),
].sort((left, right) => left.localeCompare(right));
