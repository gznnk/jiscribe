import { RectIcon } from "../../../objects/primitives/RectIcon";
import type { Stencil } from "../../../objects/Stencil";
import type { StencilCategory } from "../../../objects/StencilCategory";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import { STENCIL_LIBRARY_PANEL_GRID_COLUMNS } from "../StencilLibraryPanelStyled";

/**
 * Id of the one section the shape library shows when the host declares no
 * `stencilLibrary.sections`. It keys that section's collapse state, so a
 * restored `collapsedSectionIds` naming it collapses it.
 */
export const DEFAULT_STENCIL_LIBRARY_CATEGORY_ID = "allShapes";

/**
 * How many presets the default section lists: six full rows of the sidebar's
 * grid. An icon set registers every glyph (thousands), and the sidebar draws
 * every listed preset, so the rest is reached through search.
 */
export const DEFAULT_STENCIL_LIBRARY_LISTED_COUNT =
	6 * STENCIL_LIBRARY_PANEL_GRID_COLUMNS;

/**
 * How many matches the default section's search answers with at most. The
 * results are drawn unvirtualised like the listed presets, and a short query
 * over an icon set matches thousands; a cut a few screens long keeps a
 * keystroke cheap while leaving room to scan, and the panel says when more
 * matched.
 */
export const DEFAULT_STENCIL_LIBRARY_SEARCH_CAP = 96;

/**
 * The shape library a host gets by declaring none: one section listing the
 * first {@link DEFAULT_STENCIL_LIBRARY_LISTED_COUNT} registered presets in
 * registration order, with a `search` that reaches every registered preset by
 * its display label.
 *
 * A preset id registered more than once counts once, at its first position
 * (`StencilRegistry.get` answers with the last registration, which is the one
 * drawn); listing it twice would make the section throw on resolution.
 *
 * @param stencil Registry answering "what presets exist" for this canvas; read
 * at call time, so an empty registry gives a section with no presets, which
 * resolution then drops.
 * @param label The section heading, already resolved for the locale
 * (`CanvasMessages.stencilLibraryAllShapes`); a host's
 * `messages.stencilCategoryLabels[DEFAULT_STENCIL_LIBRARY_CATEGORY_ID]` still
 * outranks it.
 * @param resolvePresetLabel The label the sidebar shows for a preset, which
 * the search matches the query against (case-insensitively, as a substring).
 */
export const createDefaultStencilLibraryCategory = (
	stencil: StencilRegistry,
	label: string,
	resolvePresetLabel: (preset: Stencil) => string,
): StencilCategory => {
	const registeredIds = [...new Set(stencil.all().map((preset) => preset.id))];
	// Built once per category, so a keystroke only compares strings.
	const searchEntries = registeredIds.flatMap((presetId) => {
		const preset = stencil.get(presetId);
		return preset
			? [{ presetId, lowercaseLabel: resolvePresetLabel(preset).toLowerCase() }]
			: [];
	});
	return {
		id: DEFAULT_STENCIL_LIBRARY_CATEGORY_ID,
		label,
		icon: RectIcon,
		presetIds: registeredIds.slice(0, DEFAULT_STENCIL_LIBRARY_LISTED_COUNT),
		search: (query) => {
			const needle = query.toLowerCase();
			const matchedIds = searchEntries
				.filter((entry) => entry.lowercaseLabel.includes(needle))
				.map((entry) => entry.presetId);
			return {
				presetIds: matchedIds.slice(0, DEFAULT_STENCIL_LIBRARY_SEARCH_CAP),
				matchCount: matchedIds.length,
			};
		},
	};
};
