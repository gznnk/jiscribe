// External package of the 18 flowchart shapes. Fully moved out of core, building on the
// tier 2 frame-family base implementation.
// The headless parts of schema/** (createFrameObjectFactory / createFrameDocValidator /
// validateOptionalNumber / AUTO_COLOR / DEFAULT_FONT_FAMILY) come from
// `@jiscribe/canvas-sdk/doc`; the presentation / state / stencil parts (createFrameObject /
// createFrameBehavior / createFrameMapper / createFrameStateValidator /
// formatPolygonPoints / centeredPolygonOutline / OUTLINE_CURVE_SEGMENTS) come through
// `@jiscribe/canvas-sdk`. The headless parse entry point is ./doc (flowchartDocPlugin).
// Every definition matches its counterpart in core (initializeObjectRegistry.ts) exactly
// (nothing is left out on purpose). The process / onPageConnector presets stay owned by
// core (flowchartToolbarEntry references them by presetId).
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./definitions";
export { flowchartDocPlugin } from "./doc";
export { flowchartToolbarEntry } from "./stencil/FlowchartToolbarEntry";
export { flowchartPlugin } from "./plugin";
