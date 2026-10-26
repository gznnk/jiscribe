import type { Stencil } from "../../../objects/Stencil";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import type { ResolvedStencilCategory } from "../../StencilLibrary/utils/resolveStencilCategory";

/** What the rail draws, top to bottom, with every id looked up. */
export type ResolvedStencilRail = {
	/** The presets at the top, in declared order, unknown ids dropped. */
	presets: Stencil[];
	/**
	 * The pinned categories below them, in pin order: only the pins naming a
	 * section the library resolved, each as that section.
	 */
	pinnedCategories: ResolvedStencilCategory[];
	/**
	 * The categories the open document uses below the pins, most-used first:
	 * every one of `documentCategoryIds` that is not pinned, each as its section.
	 */
	unpinnedDocumentCategories: ResolvedStencilCategory[];
	/** Whether the catalog button at the bottom is drawn: the library resolved to a section at least. */
	hasCatalog: boolean;
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
 * @param documentCategoryIds - The categories the open document uses, ranked
 *   (useDocumentCategoryIds over the same `librarySections`); a pinned one is
 *   left to its pin rather than drawn twice
 * @param stencil - Registry answering "what presets exist" for this canvas
 * @throws When `presetIds` names the same id twice: the id keys the button, so
 *   the twin would be indistinguishable from the first
 */
export const resolveStencilRail = (
	presetIds: readonly string[],
	pinnedCategoryIds: readonly string[],
	librarySections: readonly ResolvedStencilCategory[],
	documentCategoryIds: readonly string[],
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
	const findSections = (categoryIds: readonly string[]) =>
		categoryIds.flatMap((categoryId) => {
			const section = librarySections.find(
				(librarySection) => librarySection.category.id === categoryId,
			);
			return section ? [section] : [];
		});
	return {
		presets,
		pinnedCategories: findSections(pinnedCategoryIds),
		unpinnedDocumentCategories: findSections(
			documentCategoryIds.filter(
				(categoryId) => !pinnedCategoryIds.includes(categoryId),
			),
		),
		hasCatalog: librarySections.length > 0,
	};
};
