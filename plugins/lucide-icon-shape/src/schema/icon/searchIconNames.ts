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

	const byName = Object.keys(ICON_NODES).filter((name) =>
		name.includes(needle),
	);
	const byFormerName = Object.entries(ICON_ALIASES)
		.filter(([alias]) => alias.includes(needle))
		.map(([, current]) => current);
	const matched = [...new Set([...byName, ...byFormerName])].sort(
		(left, right) =>
			Number(right.startsWith(needle)) - Number(left.startsWith(needle)) ||
			left.length - right.length ||
			left.localeCompare(right),
	);
	return { names: matched.slice(0, MAX_RESULTS), total: matched.length };
};
