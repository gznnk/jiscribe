// External package of the sticky shape. It builds on the tier 2 frame-family base
// implementation.
// ObjectDocDefinition / ObjectTypeDefinition are derived wholesale from features/defaults
// by createFrameObjectDoc / createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` /
// `@jiscribe/canvas-sdk`), so there is no StickyObjectFactory / validateStickyDoc /
// StickyMapper / validateStickyState. The headless part of schema/**
// (DEFAULT_FONT_FAMILY) comes from `@jiscribe/canvas-sdk/doc`; the presentation / menu
// parts (TextOverlay / calcTextRegion / createSvgTransform / the ObjectMenu UI kit) come
// through `@jiscribe/canvas-sdk`. The gradients the note's shadow is painted with are
// supplied to the canvas <defs> via `ObjectTypeDefinition.svgDefs`.
// The headless parse entry point is ./doc (stickyDocPlugin).
export * from "./schema/StickyDoc";
export * from "./state/StickyState";

export { Sticky } from "./presentation/Sticky";
export { StickyDefs } from "./presentation/StickyDefs";

export { StickyColorMenu } from "./menu/StickyColorMenu";
export { STICKY_PRESET_COLORS } from "./menu/StickyColorConstants";
export type { StickyColorPreset } from "./menu/StickyColorConstants";

export { StickyIcon } from "./stencil/StickyIcon";
export { StickyStencils } from "./stencil/StickyStencils";

export { stickyDefinition } from "./definition";
export { stickyDocDefinition, stickyDocPlugin } from "./doc";
export { stickyPlugin } from "./plugin";
