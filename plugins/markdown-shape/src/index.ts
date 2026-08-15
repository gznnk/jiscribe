// External package of the markdown shape. It builds on the tier 2 frame-family base
// implementation.
// ObjectDocDefinition / ObjectTypeDefinition are derived wholesale from features/defaults
// by createFrameObjectDoc / createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` /
// `@jiscribe/canvas-sdk`), so there is no MarkdownObjectFactory / validateMarkdownDoc /
// MarkdownMapper / validateMarkdownState. The headless parts of schema/** (AUTO_COLOR /
// DEFAULT_FONT_FAMILY) come from `@jiscribe/canvas-sdk/doc`; the presentation parts
// (createFrameObject / TextOverlayFrame) come through `@jiscribe/canvas-sdk`. Only the
// rendering of the body is swapped out, so the shape's look, hit testing and menu ride on
// the same defaults as rect. The headless parse entry point is ./doc (markdownDocPlugin).
export * from "./schema/MarkdownDoc";
export * from "./state/MarkdownState";

export { Markdown } from "./presentation/Markdown";
export { MarkdownOverlay } from "./presentation/MarkdownOverlay";

export { MarkdownStencils } from "./stencil/MarkdownStencils";

export { markdownDefinition } from "./definition";
export { markdownDocDefinition, markdownDocPlugin } from "./doc";
export { markdownPlugin } from "./plugin";
