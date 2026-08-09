// markdown 図形の外部パッケージ。tier 2 の frame 系ベース実装を利用する。
// ObjectDocDefinition / ObjectTypeDefinition は createFrameObjectDoc /
// createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`)
// が features/defaults から丸ごと導出するため、MarkdownObjectFactory /
// validateMarkdownDoc / MarkdownMapper / validateMarkdownState は持たない。
// schema/** の headless 部品 (AUTO_COLOR / DEFAULT_FONT_FAMILY) は
// `@jiscribe/canvas-sdk/doc`、presentation 部品 (createFrameObject /
// TextOverlayFrame) は `@jiscribe/canvas-sdk` 経由。本文の描画だけを差し替えるため、図形の見た目・
// 当たり判定・メニューは rect と同じ既定に乗る。headless な parse 入口は ./doc
// (markdownDocPlugin)。
export * from "./schema/MarkdownDoc";
export * from "./state/MarkdownState";

export { Markdown } from "./presentation/Markdown";
export { MarkdownOverlay } from "./presentation/MarkdownOverlay";

export { MarkdownStencils } from "./stencil/MarkdownStencils";

export { markdownDefinition } from "./definition";
export { markdownDocDefinition, markdownDocPlugin } from "./doc";
export { markdownPlugin } from "./plugin";
