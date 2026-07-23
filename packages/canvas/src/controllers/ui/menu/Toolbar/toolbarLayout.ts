/**
 * Describes the top-level arrangement of the ShapeLibrary section of the toolbar.
 *
 * The bar is an ordered list of entries mixing two kinds:
 * - `preset`: a shape button pinned directly on the bar (the classic flat display).
 * - `category`: a category button that opens a flyout listing that category's presets.
 *
 * This keeps "direct display" and the category submenus (issue #184) on the same
 * axis, decoupled from preset registration. Hosts can override the whole list via
 * the `toolbar.layout` Canvas prop.
 */
export type ToolbarEntry =
	| { kind: "preset"; presetId: string }
	| { kind: "category"; categoryId: string };

/**
 * Default toolbar layout: the basic primitives and sticky stay pinned directly
 * (preserving the classic direct-placement UX); flowchart / general / annotation
 * fold into category flyouts. Only core categories appear here — a plugin category
 * (e.g. container) is shown only when the host adds its slot via `toolbar.layout`.
 * `basic` has no flyout button by default because its members are all pinned
 * already — hosts can add `{ kind: "category", categoryId: "basic" }` if they want one.
 */
export const DEFAULT_TOOLBAR_LAYOUT: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "rect-markdown" },
	{ kind: "category", categoryId: "flowchart" },
	{ kind: "category", categoryId: "general" },
	{ kind: "category", categoryId: "annotation" },
];
