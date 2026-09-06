import type { ComponentType } from "react";

import { RectIcon } from "./primitives/RectIcon";
import type { StencilIconProps } from "./Stencil";
import type { LocaleMessages } from "../../messages/resolveLocaleMessages";

/**
 * A named, ordered group of stencils. Where it shows is the host's call: a
 * category flyout on the toolbar (`toolbar.layout`), a section of the shape
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
};

/**
 * The `basic` primitives as a category. Not in `DEFAULT_TOOLBAR_LAYOUT` (its
 * members are pinned directly there); exported for a host that folds them into
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
