/**
 * Shape-authoring kit for canvas plugins: the whole of `@jiscribe/canvas/unstable`
 * plus the parts only plugins use. Headless counterpart is `./doc`.
 */

export * from "@jiscribe/canvas/unstable";

// One call per Frame-family shape in place of its mapper / state-validator files.
// Takes the ObjectDocDefinition built by createFrameObjectDoc in `./doc`.
export { createFrameObjectDefinition } from "./definition/createFrameObjectDefinition";
export type { FrameObjectDefinitionParams } from "./definition/createFrameObjectDefinition";

// ---------------------------------------------------------------------------
// Caption shapes (`features.text: "label"`): the box is fully taken by the
// drawing, so the text hangs under it as a caption sized from itself (server /
// actor / cross …). The core places the caption, its background and its visual
// extent; what is left to the shape is the grab area, placed inside its own
// `data-kind="object"` group so the caption can be grabbed.
// ---------------------------------------------------------------------------
export { BelowLabelHitArea } from "./presentation/BelowLabelHitArea";
// The box the caption's background is painted on is LabelTextFill, in the
// unstable surface re-exported above: createFrameObject draws it, and a caption
// shape whose component is written without createFrameObject draws it itself.

// For a frame shape that passes its interior through (container, awsGroup): the
// width of the invisible strip that makes its border grabbable, since the
// painted border alone is too thin to aim at.
export { FRAME_BORDER_HIT_STROKE_WIDTH } from "./presentation/frameBorderHitStrokeWidth";

// Outline helpers for drawing frame-based plugin shapes and their connector
// outline. The `points` string they are drawn with is `formatPolygonPoints`, in
// the unstable surface re-exported above. Headless, and re-exported from `./doc`
// as well, where the shape's doc definition declares its `outline` with them.
export {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "./schema/outlineHelpers";
export { calcRoundedRectOutline } from "./schema/calcRoundedRectOutline";

// For shapes whose text region is nothing but a fixed ratio inset of the box
// (most shapes holding their text inside the box): pass the ratios in place of a hand-written
// calc*TextRegion.ts. A shape whose inset depends on width/height keeps its own.
// Headless, and re-exported from `./doc` as well, so the shape's doc definition
// and its UI definition can register the very same calculator.
export { createInsetTextRegion } from "./schema/createInsetTextRegion";

// The shape's own silhouette: stroked, filled and grabbable. Takes the
// FrameShapeProps createFrameObject hands its draw function, so spreading them
// makes it the object's single `data-kind` element.
export {
	ShapeBodyPath,
	ShapeBodyPolygon,
} from "./presentation/ShapeBodyStyled";

// Stencil palette boilerplate: the `<svg>` frame every icon shares, and the
// `stencils` array of a type whose single preset is named after the type.
export { createStencilIcon } from "./stencil/createStencilIcon";
export { createTypeStencils } from "./stencil/createTypeStencils";

// ---------------------------------------------------------------------------
// Icon sets shipped as generated data: the drawing side of what `./doc`'s
// createIconSetCatalog looks names up for. A set hands its catalog and its
// generated drawings to these and gets its shape's component, its presets and
// its stencil category back.
// ---------------------------------------------------------------------------
export { createIconSetObject } from "./presentation/iconSet/createIconSetObject";
export type {
	IconSetObjectParams,
	IconSetObjectState,
} from "./presentation/iconSet/createIconSetObject";
export { IconSetArt } from "./presentation/iconSet/IconSetArt";
export {
	calcIconSetArtPlacement,
	readIconSetViewBoxSize,
} from "./presentation/iconSet/calcIconSetArtPlacement";
export type { IconSetArtPlacement } from "./presentation/iconSet/calcIconSetArtPlacement";
export { IconSetArtGroup } from "./presentation/iconSet/IconSetStyled";
export { readIconSetArt } from "./presentation/iconSet/readIconSetArt";
export { createIconSetStencilIcon } from "./stencil/iconSet/createIconSetStencilIcon";
export type { IconSetStencilIconParams } from "./stencil/iconSet/createIconSetStencilIcon";
export { createIconSetStencils } from "./stencil/iconSet/createIconSetStencils";
export type { IconSetStencilsParams } from "./stencil/iconSet/createIconSetStencils";
export { createIconSetStencilCategory } from "./stencil/iconSet/createIconSetStencilCategory";
export type { IconSetStencilCategoryParams } from "./stencil/iconSet/createIconSetStencilCategory";
export { toIconSetStencilId } from "./stencil/iconSet/toIconSetStencilId";
