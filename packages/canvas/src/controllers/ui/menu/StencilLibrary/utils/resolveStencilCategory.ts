import type { Stencil } from "../../../objects/Stencil";
import type {
	StencilCategory,
	StencilCategoryBrowseGroup,
} from "../../../objects/StencilCategory";
import type { StencilRegistry } from "../../../objects/StencilRegistry";

/** One of a category's `browseGroups` paired with the presets its ids resolved to. */
export type ResolvedStencilCategoryBrowseGroup = {
	group: StencilCategoryBrowseGroup;
	/** Never empty: a group none of whose ids resolved is dropped. */
	presets: Stencil[];
};

/** A category paired with the presets its `presetIds` resolved to. */
export type ResolvedStencilCategory = {
	category: StencilCategory;
	presets: Stencil[];
	/**
	 * The `browseGroups` left non-empty, in the declared order; empty when the
	 * category declares none or none resolved, and the section then offers no
	 * "show all" view.
	 */
	browseGroups: ResolvedStencilCategoryBrowseGroup[];
};

/**
 * Resolves one category's `presetIds` against the registry, in the declared order.
 *
 * An id naming no registered preset (a plugin the host did not apply) is
 * silently skipped, so a category can name more than the host installed.
 * `browseGroups` resolve the same way, each group on its own; a group left
 * empty is dropped. They are resolved whether or not `presetIds` resolves
 * anything, though the category is dropped as a whole when it does not.
 *
 * @param category Group whose `presetIds` are looked up; `label` / `icon` / `id`
 * are carried through untouched.
 * @param stencil Registry answering "what presets exist" for this canvas.
 * @returns The category with its resolved presets, or null when not one id of
 * `presetIds` resolved — the caller drops the whole group rather than drawing
 * it empty.
 * @throws When `presetIds` names the same id twice, when two `browseGroups`
 *   share an id, or when one group names the same preset id twice. The ids key
 *   the rendered items and sections, so a repeat would show up only as React's
 *   duplicate-key warning; the check is on the declared ids, so it fires whether
 *   or not the plugin owning the id is installed.
 */
export const resolveStencilCategory = (
	category: StencilCategory,
	stencil: StencilRegistry,
): ResolvedStencilCategory | null => {
	const seenPresetIds = new Set<string>();
	for (const presetId of category.presetIds) {
		if (seenPresetIds.has(presetId)) {
			throw new Error(
				`resolveStencilCategory: category "${category.id}" lists the preset id "${presetId}" twice; each id may appear once in presetIds`,
			);
		}
		seenPresetIds.add(presetId);
	}

	const browseGroups = resolveBrowseGroups(category, stencil);
	const presets = category.presetIds
		.map((presetId) => stencil.get(presetId))
		.filter((preset) => preset !== undefined);
	return presets.length > 0 ? { category, presets, browseGroups } : null;
};

/** The category's `browseGroups` resolved and left non-empty; throws on a repeated id. */
const resolveBrowseGroups = (
	category: StencilCategory,
	stencil: StencilRegistry,
): ResolvedStencilCategoryBrowseGroup[] => {
	const seenGroupIds = new Set<string>();
	const resolvedGroups: ResolvedStencilCategoryBrowseGroup[] = [];
	for (const group of category.browseGroups ?? []) {
		if (seenGroupIds.has(group.id)) {
			throw new Error(
				`resolveStencilCategory: category "${category.id}" uses the browse group id "${group.id}" twice; each id may appear once in browseGroups`,
			);
		}
		seenGroupIds.add(group.id);
		const seenPresetIds = new Set<string>();
		for (const presetId of group.presetIds) {
			if (seenPresetIds.has(presetId)) {
				throw new Error(
					`resolveStencilCategory: browse group "${group.id}" of category "${category.id}" lists the preset id "${presetId}" twice; each id may appear once in a group's presetIds`,
				);
			}
			seenPresetIds.add(presetId);
		}
		const presets = group.presetIds
			.map((presetId) => stencil.get(presetId))
			.filter((preset) => preset !== undefined);
		if (presets.length > 0) {
			resolvedGroups.push({ group, presets });
		}
	}
	return resolvedGroups;
};

/**
 * Resolves every category in display order, dropping the ones left empty.
 *
 * @param categories Groups in display order (the sidebar's sections, or the
 * `stencilCategory` items of a toolbar section).
 * @param stencil Registry answering "what presets exist" for this canvas.
 * @returns The resolvable groups in the given order; empty when none resolves.
 * @throws When two groups share an `id`, or one of them repeats a preset id
 *   (see {@link resolveStencilCategory}). The id keys the rendered section, its
 *   collapse state and its DOM ids, so a repeat would be indistinguishable from
 *   the first section rather than visibly wrong.
 */
export const resolveStencilCategories = (
	categories: readonly StencilCategory[],
	stencil: StencilRegistry,
): ResolvedStencilCategory[] => {
	const seenCategoryIds = new Set<string>();
	for (const category of categories) {
		if (seenCategoryIds.has(category.id)) {
			throw new Error(
				`resolveStencilCategories: the category id "${category.id}" is used by two sections; each id may appear once`,
			);
		}
		seenCategoryIds.add(category.id);
	}

	return categories.flatMap((category) => {
		const resolved = resolveStencilCategory(category, stencil);
		return resolved ? [resolved] : [];
	});
};
