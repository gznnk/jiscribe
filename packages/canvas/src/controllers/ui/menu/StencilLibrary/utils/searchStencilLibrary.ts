import type { ResolvedStencilCategory } from "./resolveStencilCategory";
import type { Stencil } from "../../../objects/Stencil";

/** What the sidebar shows for one query. */
export type StencilLibrarySearchResult = {
	/** One flat list in section order, each preset at most once. */
	presets: Stencil[];
	/**
	 * Matches the categories' own `search` cut off, summed. Ids dropped as repeats
	 * or as unknown to the registry are not counted back in.
	 */
	hiddenMatchCount: number;
};

/**
 * Searches the sidebar's sections for one query.
 *
 * Section by section, the listed presets whose label contains the query
 * (case-insensitively) come first, then whatever the category's `search` answers.
 *
 * @param sections Sections in display order, as the sidebar resolved them.
 * @param trimmedQuery The query already trimmed; an empty one matches nothing.
 * @param resolveLabel Display label of a listed preset, the one the user reads.
 * @param resolvePreset Looks up a `search` answer's id; undefined drops the id.
 */
export const searchStencilLibrary = (
	sections: readonly ResolvedStencilCategory[],
	trimmedQuery: string,
	resolveLabel: (preset: Stencil) => string,
	resolvePreset: (presetId: string) => Stencil | undefined,
): StencilLibrarySearchResult => {
	if (trimmedQuery === "") {
		return { presets: [], hiddenMatchCount: 0 };
	}
	const needle = trimmedQuery.toLowerCase();
	const seenIds = new Set<string>();
	const presets: Stencil[] = [];
	let hiddenMatchCount = 0;

	const take = (preset: Stencil) => {
		if (seenIds.has(preset.id)) {
			return;
		}
		seenIds.add(preset.id);
		presets.push(preset);
	};

	for (const section of sections) {
		for (const preset of section.presets) {
			if (resolveLabel(preset).toLowerCase().includes(needle)) {
				take(preset);
			}
		}
		const search = section.category.search;
		if (!search) {
			continue;
		}
		const found = search(trimmedQuery);
		for (const presetId of found.presetIds) {
			const preset = resolvePreset(presetId);
			if (preset) {
				take(preset);
			}
		}
		hiddenMatchCount += Math.max(0, found.matchCount - found.presetIds.length);
	}
	return { presets, hiddenMatchCount };
};
