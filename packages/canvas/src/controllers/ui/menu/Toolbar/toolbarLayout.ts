import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../messages/resolveLocaleMessages";
import { CalloutIcon } from "../../objects/annotations/CalloutIcon";
import { CloudIcon } from "../../objects/general/CloudIcon";
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
 * Built-in category entries. The category icon reuses a representative shape icon
 * (a dedicated glyph set can replace these later without touching callers). Hosts
 * compose these into a `toolbar.layout`; plugins export their own entries (e.g.
 * `flowchartToolbarEntry`, `containerToolbarEntry`).
 */
export const generalToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "general",
	label: { en: "General", ja: "一般" },
	icon: CloudIcon,
	presetIds: ["cloud", "actor"],
};

export const annotationToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "annotation",
	label: { en: "Annotation", ja: "注釈" },
	icon: CalloutIcon,
	presetIds: ["callout", "sticky"],
};

/**
 * The `basic` primitives as a category entry. Not in `DEFAULT_TOOLBAR_LAYOUT`
 * (its members are pinned directly there); exported for a host that prefers to
 * fold them into a flyout.
 */
export const basicToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "basic",
	label: { en: "Basic", ja: "基本" },
	icon: RectIcon,
	presetIds: ["rect", "ellipse", "polyline", "polygon", "rect-markdown"],
};

/**
 * Default toolbar layout: the basic primitives and sticky stay pinned directly
 * (preserving the classic direct-placement UX); general / annotation fold into
 * category flyouts. Only core categories appear here — a plugin category (e.g.
 * flowchart, container) is shown only when the host adds its entry via
 * `toolbar.layout`.
 */
export const DEFAULT_TOOLBAR_LAYOUT: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "rect-markdown" },
	generalToolbarEntry,
	annotationToolbarEntry,
];
