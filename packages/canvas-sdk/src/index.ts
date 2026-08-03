/**
 * Shape-authoring kit for canvas plugins: the whole of `@workspace/canvas/unstable`
 * plus the parts only plugins use. Headless counterpart is `./doc`.
 */

export * from "@workspace/canvas/unstable";

// One call per Frame-family shape in place of its mapper / state-validator files.
// Takes the ObjectDocDefinition built by createFrameObjectDoc in `./doc`.
export { createFrameObjectDefinition } from "./definition/createFrameObjectDefinition";
export type { FrameObjectDefinitionParams } from "./definition/createFrameObjectDefinition";

// ---------------------------------------------------------------------------
// Below-label shapes: the box is fully taken by the drawing, so the text hangs
// under it as a caption sized from itself (server / actor / cross …).
// ---------------------------------------------------------------------------
// The three pieces go together: register the region as the type's `textRegion`
// and the bounds as its `visualBounds` (without the latter, zoom-to-fit and the
// export viewBox crop the label away), and place the hit area inside the shape's
// own `data-kind="object"` group so the label can be grabbed. The typography
// they measure with lives in `./doc` as BELOW_LABEL_STYLE_DEFAULTS.
export {
	BELOW_LABEL_GAP,
	calcBelowLabelTextRegion,
} from "./presentation/calcBelowLabelTextRegion";
export { calcBelowLabelVisualBounds } from "./presentation/calcBelowLabelVisualBounds";
export { BelowLabelHitArea } from "./presentation/BelowLabelHitArea";

// Polygon/outline helpers for drawing frame-based plugin shapes and their connector outline.
export { formatPolygonPoints } from "./presentation/formatPolygonPoints";
export {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "./presentation/outlineHelpers";
export { calcRoundedRectOutline } from "./presentation/calcRoundedRectOutline";

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
