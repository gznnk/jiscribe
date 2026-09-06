import type { StencilCategory } from "../../objects/StencilCategory";

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
 * - `category`: a category button that opens a flyout listing the category's
 *   `presetIds` in order (see {@link StencilCategory}). The same category object
 *   can also be passed to `stencilLibrary.sections`.
 *
 * Hosts can override the whole list via the `toolbar.layout` Canvas prop; a
 * `presetId` naming no registered preset (e.g. a plugin not applied) is skipped.
 */
export type ToolbarEntry =
	| { kind: "preset"; presetId: string }
	| { kind: "category"; category: StencilCategory };

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
