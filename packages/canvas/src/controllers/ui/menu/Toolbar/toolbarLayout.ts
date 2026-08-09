import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../messages/resolveLocaleMessages";
import { RectIcon } from "../../objects/primitives/RectIcon";
import type { StencilIconProps } from "../../objects/Stencil";

/**
 * Describes the top-level arrangement of the StencilLibrary section of the toolbar.
 *
 * The layout is the single source of order and of category metadata: it names, in
 * display order, both what appears at the top level and what fills each category
 * flyout. The preset registry only answers "what presets exist" — never "in what
 * order" or "under which category".
 *
 * The bar is an ordered list of entries mixing two kinds:
 * - `preset`: a shape button pinned directly on the bar (the classic flat display).
 * - `category`: a category button that opens a flyout listing `presetIds` in order.
 *   Its `label` / `icon` are carried inline; `id` keys the flyout open/close state
 *   and resolves a host label override (`messages.stencilCategoryLabels[id]`).
 *
 * Hosts can override the whole list via the `toolbar.layout` Canvas prop; a
 * `presetId` naming no registered preset (e.g. a plugin not applied) is skipped.
 */
export type ToolbarEntry =
	| { kind: "preset"; presetId: string }
	| {
			kind: "category";
			id: string;
			/** A plain string (all locales) or a `LocaleMessages` dictionary. */
			label: string | LocaleMessages<string>;
			/** Icon shown on the category button. */
			icon: ComponentType<StencilIconProps>;
			presetIds: string[];
	  };

/**
 * The `basic` primitives as a category entry. Not in `DEFAULT_TOOLBAR_LAYOUT`
 * (its members are pinned directly there); exported for a host that prefers to
 * fold them into a flyout. The category icon reuses a representative shape icon
 * (a dedicated glyph set can replace these later without touching callers);
 * plugins export their own entries (e.g. `flowchartToolbarEntry`,
 * `containerToolbarEntry`, `generalToolbarEntry`).
 */
export const basicToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "basic",
	label: { en: "Basic", ja: "基本" },
	icon: RectIcon,
	presetIds: ["rect", "ellipse", "polyline", "polygon", "text"],
};

/**
 * Default toolbar layout: every core preset pinned directly (the classic
 * direct-placement UX), no category flyout. Core owns the basic primitives and
 * nothing else, so those are the whole bar. Anything a plugin
 * supplies (the annotation / flowchart / container / general categories, the
 * `markdown` / `sticky` presets) is shown only when the host adds it via
 * `toolbar.layout`.
 */
export const DEFAULT_TOOLBAR_LAYOUT: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "text" },
];
