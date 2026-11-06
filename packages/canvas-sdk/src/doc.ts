/**
 * Headless (UI-independent) counterpart of `.`: the whole of
 * `@jiscribe/doc/unstable` plus the doc-side parts only plugins use.
 */

export * from "@jiscribe/doc/unstable";

// One call per Frame-family shape in place of its factory / doc-validator files.
// The UI-side counterpart is createFrameObjectDefinition in `.`, which takes the
// ObjectDocDefinition this returns.
export { createFrameObjectDoc } from "./schema/createFrameObjectDoc";
export type { FrameObjectDocParams } from "./schema/createFrameObjectDoc";

// The text region of a shape whose region is a fixed ratio inset of its box.
// Headless, so the shape's doc definition and its UI definition register the very
// same function: `.` re-exports this one rather than declaring its own.
export { createInsetTextRegion } from "./schema/createInsetTextRegion";

// The pieces a shape's `outline` is built from: a top-left polygon builder moved to
// the centered origin the outline is read in, the sampling density of a curved
// edge, and a rounded rectangle. Headless, since the outline is declared on the
// doc definition (createFrameObjectDoc); `.` re-exports these same ones for the
// renderer that draws the matching silhouette.
export {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "./schema/outlineHelpers";
export { calcRoundedRectOutline } from "./schema/calcRoundedRectOutline";

// Icon sets shipped as generated data (AWS Architecture Icons and the like): the
// name lookup over one set's catalog, and the data types the generated catalog
// and drawing modules are written against. The drawing side is `.`'s
// createIconSetObject / createIconSetStencilCategory; the generator is
// `./icon-set-generator`.
export { createIconSetCatalog } from "./schema/iconSet/createIconSetCatalog";
export type {
	IconSetCatalog,
	IconSetCatalogConfig,
} from "./schema/iconSet/createIconSetCatalog";
export { normalizeIconSetName } from "./schema/iconSet/normalizeIconSetName";
export type {
	IconSetBrowseGroup,
	IconSetBrowseGroupDeclaration,
	IconSetCatalogEntry,
	IconSetDrawing,
	IconSetNode,
	IconSetPaletteEntry,
	IconSetSearchResult,
} from "./schema/iconSet/IconSetTypes";
