import type { ComponentType } from "react";

import { RectIcon } from "./primitives/RectIcon";
import type { StencilIconProps } from "./Stencil";
import type { LocaleMessages } from "../../../foundation/i18n/resolveLocaleMessages";

/** One answer to a library search, out of a category's whole set. */
export type StencilCategorySearchResult = {
	/** Registered preset ids in rank order, already cut to the category's own cap. */
	presetIds: string[];
	/** How many matched before the cut; equal to `presetIds.length` when nothing was cut. */
	matchCount: number;
};

/**
 * Answers the sidebar search out of everything a category holds, listed in
 * `presetIds` or not. Every id it returns must be a registered preset (one the
 * type's `stencils` carries); an id the registry does not know is dropped
 * silently. Called while the shape library's search box holds a query: in the
 * sections view for every category, and in a category's "show all" view
 * (`browseGroups`) for that category alone, where its answer replaces the
 * label match over the browsed presets.
 *
 * @param query Already trimmed and never empty. Case and separators are the
 *   category's own business: the sidebar does not fold them.
 * @returns The ids to show after the category's label matches (a repeat of an
 *   id already shown is dropped), and how many there were before the cut.
 */
export type StencilCategorySearch = (
	query: string,
) => StencilCategorySearchResult;

/** One collapsible section of a category's "show all" view. */
export type StencilCategoryBrowseGroup = {
	/** Unique within the category (a repeat throws on resolution); keys the section's fold state in the view. */
	id: string;
	/** A plain string (all locales) or a `LocaleMessages` dictionary; no host override applies to it. */
	label: string | LocaleMessages<string>;
	/**
	 * Registered preset ids in display order; an id the registry does not know is
	 * dropped, and a group left with none is not shown. A repeat within the group throws.
	 */
	presetIds: string[];
};

/**
 * A named, ordered group of stencils. Where it shows is the host's call: a
 * category flyout on the toolbar (`toolbar.sections`), a section of the shape
 * library sidebar (`stencilLibrary.sections`), or both from one declaration.
 *
 * `presetIds` is the group's order; the preset registry only answers "what
 * presets exist". `id` keys the flyout open/close state, the sidebar's collapse
 * state and the host label override (`messages.stencilCategoryLabels[id]`).
 */
export type StencilCategory = {
	id: string;
	/** A plain string (all locales) or a `LocaleMessages` dictionary. */
	label: string | LocaleMessages<string>;
	/** Icon shown on the category button / section header. */
	icon: ComponentType<StencilIconProps>;
	presetIds: string[];
	/**
	 * Lets the sidebar search reach presets beyond `presetIds`; a section that
	 * declares it also points to the search from under its listed presets,
	 * unless `browseGroups` puts its "show all" button there.
	 * Omitted = the sections view's search sees only the labels of `presetIds`;
	 * the rest of `browseGroups`, if any, is matched by label only inside the
	 * "show all" view. The toolbar flyout ignores it.
	 */
	search?: StencilCategorySearch;
	/**
	 * Everything the category holds, in sections, for the shape library's "show
	 * all" view, entered from a button under the section's listed presets (it
	 * takes the place of the pointer to the search that `search` puts there).
	 * Omitted, or every group left empty once resolved = the section offers no
	 * such view. The toolbar flyout ignores it.
	 */
	browseGroups?: StencilCategoryBrowseGroup[];
};

/**
 * The `basic` primitives as a category. Not on either default bar (its members
 * are pinned directly on the stencil bar); exported for a host that folds them into
 * a flyout, or into the shape library sidebar. The icon reuses a representative
 * shape icon (a dedicated glyph set can replace these later without touching
 * callers); plugins export their own categories (e.g. `flowchartStencilCategory`,
 * `containerStencilCategory`, `generalStencilCategory`).
 */
export const basicStencilCategory: StencilCategory = {
	id: "basic",
	label: { en: "Basic", ja: "基本" },
	icon: RectIcon,
	presetIds: ["rect", "ellipse", "polyline", "polygon", "text"],
};
