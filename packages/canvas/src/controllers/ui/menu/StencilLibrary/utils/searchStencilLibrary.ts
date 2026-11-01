import { DEFAULT_STENCIL_LIBRARY_SEARCH_CAP } from "./createDefaultStencilLibraryCategory";
import type { ResolvedStencilCategory } from "./resolveStencilCategory";
import type { Stencil } from "../../../objects/Stencil";

/** What the sidebar shows for one query. */
export type StencilLibrarySearchResult = {
	/** One flat list in section order, each preset at most once. */
	presets: Stencil[];
	/**
	 * Matches cut off and not shown: in the sections view, what the categories'
	 * own `search` cut off, summed; in a "show all" view, what that category's
	 * `search` cut off or, without one, the label matches past
	 * `DEFAULT_STENCIL_LIBRARY_SEARCH_CAP`. Ids dropped as repeats or as unknown
	 * to the registry are not counted back in.
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

/**
 * Searches one category for its "show all" view.
 *
 * A category with `search` is answered by that alone; its browsed presets are
 * not matched by label on top. Without one, every preset of its `browseGroups`
 * whose label contains the query (case-insensitively) matches, in group order,
 * cut to {@link DEFAULT_STENCIL_LIBRARY_SEARCH_CAP}.
 *
 * @param section The category being shown in full, as the sidebar resolved it.
 * @param trimmedQuery The query already trimmed; an empty one matches nothing.
 * @param resolveLabel Display label of a browsed preset, the one the user reads.
 * @param resolvePreset Looks up a `search` answer's id; undefined drops the id.
 * @returns The matches, each preset once; `hiddenMatchCount` is what the cut
 *   (the category's own or the cap) left out.
 */
export const searchStencilLibraryCategory = (
	section: ResolvedStencilCategory,
	trimmedQuery: string,
	resolveLabel: (preset: Stencil) => string,
	resolvePreset: (presetId: string) => Stencil | undefined,
): StencilLibrarySearchResult => {
	if (trimmedQuery === "") {
		return { presets: [], hiddenMatchCount: 0 };
	}
	const seenIds = new Set<string>();
	const search = section.category.search;
	if (search) {
		const found = search(trimmedQuery);
		const presets: Stencil[] = [];
		for (const presetId of found.presetIds) {
			const preset = resolvePreset(presetId);
			if (preset && !seenIds.has(preset.id)) {
				seenIds.add(preset.id);
				presets.push(preset);
			}
		}
		return {
			presets,
			hiddenMatchCount: Math.max(0, found.matchCount - found.presetIds.length),
		};
	}

	const needle = trimmedQuery.toLowerCase();
	const matched: Stencil[] = [];
	for (const { presets } of section.browseGroups) {
		for (const preset of presets) {
			if (
				!seenIds.has(preset.id) &&
				resolveLabel(preset).toLowerCase().includes(needle)
			) {
				seenIds.add(preset.id);
				matched.push(preset);
			}
		}
	}
	return {
		presets: matched.slice(0, DEFAULT_STENCIL_LIBRARY_SEARCH_CAP),
		hiddenMatchCount: Math.max(
			0,
			matched.length - DEFAULT_STENCIL_LIBRARY_SEARCH_CAP,
		),
	};
};
