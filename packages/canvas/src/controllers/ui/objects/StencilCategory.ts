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
 * Answers the library search out of everything a category holds, listed in
 * `presetIds` or not. Every id it returns must be a registered preset (one the
 * type's `stencils` carries); an id the registry does not know is dropped
 * silently. Called only while a stencil panel's search box has a query — the
 * catalog's, or the category's own.
 *
 * @param query Already trimmed and never empty. Case and separators are the
 *   category's own business: the panel does not fold them.
 * @returns The ids to show after the category's label matches (a repeat of an
 *   id already shown is dropped), and how many there were before the cut.
 */
export type StencilCategorySearch = (
	query: string,
) => StencilCategorySearchResult;

/**
 * A named, ordered group of stencils: one section of the stencil library
 * (`stencilLibrary.sections`). The catalog lists it, and pinned to the rail it
 * gets a button of its own that opens its presets in a panel.
 *
 * `presetIds` is the group's order; the preset registry only answers "what
 * presets exist". `id` keys the pins (`CanvasConfig.pinnedCategoryIds`), which
 * panel is open and the host label override
 * (`messages.stencilCategoryLabels[id]`).
 */
export type StencilCategory = {
	id: string;
	/** A plain string (all locales) or a `LocaleMessages` dictionary. */
	label: string | LocaleMessages<string>;
	/** Icon shown on the category's rail button and its catalog row. */
	icon: ComponentType<StencilIconProps>;
	presetIds: string[];
	/**
	 * Lets the library search reach presets beyond `presetIds`, in the catalog and
	 * in the category's own panel; that panel also points to its search box from
	 * under the listed presets. Omitted = the category holds exactly `presetIds`,
	 * and the search sees only their labels.
	 */
	search?: StencilCategorySearch;
};

/**
 * The `basic` primitives as a category. The default rail already carries its
 * members as presets (`DEFAULT_RAIL_PRESET_IDS`); exported for a host that lists
 * them in its library too. The icon reuses a representative
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
