import type { Stencil } from "../../../objects/Stencil";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import type { ResolvedStencilCategory } from "../../StencilLibrary/utils/resolveStencilCategory";

/** What the rail draws, top to bottom, with every id looked up. */
export type ResolvedStencilRail = {
	/** The presets at the top, in declared order, unknown ids dropped. */
	presets: Stencil[];
	/** Whether the catalog button under the presets is drawn: the library resolved to a section at least. */
	hasCatalog: boolean;
	/**
	 * The pinned categories below the catalog button, in pin order: only the
	 * pins naming a section the library resolved, each as that section.
	 */
	pinnedCategories: ResolvedStencilCategory[];
};

/**
 * Turns the rail's declarations into what it draws.
 *
 * @param presetIds - The host's `rail.presetIds` (or the default); an id naming
 *   no registered preset is skipped
 * @param pinnedCategoryIds - The user's pins in rail order (reducer state); a
 *   pin naming no section of `librarySections` is left off the rail, not
 *   reported as an error, since the plugin behind it may simply be missing here
 * @param librarySections - `stencilLibrary.sections` already resolved against
 *   the registry, sections left empty dropped (resolveStencilCategories); empty
 *   means no library, and with it no pinned category and no catalog button
 * @param stencil - Registry answering "what presets exist" for this canvas
 * @throws When `presetIds` names the same id twice: the id keys the button, so
 *   the twin would be indistinguishable from the first
 */
export const resolveStencilRail = (
	presetIds: readonly string[],
	pinnedCategoryIds: readonly string[],
	librarySections: readonly ResolvedStencilCategory[],
	stencil: StencilRegistry,
): ResolvedStencilRail => {
	const seenPresetIds = new Set<string>();
	for (const presetId of presetIds) {
		if (seenPresetIds.has(presetId)) {
			throw new Error(
				`resolveStencilRail: rail.presetIds lists "${presetId}" twice; each id may appear once`,
			);
		}
		seenPresetIds.add(presetId);
	}

	const presets = presetIds
		.map((presetId) => stencil.get(presetId))
		.filter((preset) => preset !== undefined);
	const pinnedCategories = pinnedCategoryIds.flatMap((categoryId) => {
		const section = librarySections.find(
			(librarySection) => librarySection.category.id === categoryId,
		);
		return section ? [section] : [];
	});
	return {
		presets,
		hasCatalog: librarySections.length > 0,
		pinnedCategories,
	};
};
