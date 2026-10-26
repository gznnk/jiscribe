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
 * silently. Called only while the sidebar has a query.
 *
 * @param query Already trimmed and never empty. Case and separators are the
 *   category's own business: the sidebar does not fold them.
 * @returns The ids to show after the category's label matches (a repeat of an
 *   id already shown is dropped), and how many there were before the cut.
 */
export type StencilCategorySearch = (
	query: string,
) => StencilCategorySearchResult;

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
	 * declares it also points to the search from under its listed presets.
	 * Omitted = the category holds exactly `presetIds`, and the search sees only
	 * their labels. The toolbar flyout ignores it.
	 */
	search?: StencilCategorySearch;
};

/**
 * The `basic` primitives as a category. Not in `DEFAULT_TOOLBAR_TOOLS_SECTION`
 * (its members are pinned directly there); exported for a host that folds them into
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
