// markdown 図形の外部パッケージ。tier 2 の frame 系ベース実装を利用する。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、
// presentation / state 部品 (createFrameObject / createFrameBehavior /
// createFrameMapper / createFrameStateValidator / TextOverlayFrame) は
// `@workspace/canvas/unstable` 経由。本文の描画だけを差し替えるため、図形の見た目・
// 当たり判定・メニューは rect と同じ既定に乗る。headless な parse 入口は ./doc
// (markdownDocPlugin)。
export * from "./schema/MarkdownDoc";
export { MarkdownObjectFactory } from "./schema/MarkdownObjectFactory";
export { validateMarkdownDoc } from "./schema/validateMarkdownDoc";

export * from "./state/MarkdownState";
export { markdownToDoc, markdownToState } from "./state/MarkdownMapper";
export { isValidMarkdownState } from "./state/validateMarkdownState";

export { Markdown } from "./presentation/Markdown";
export { MarkdownOverlay } from "./presentation/MarkdownOverlay";

export { MarkdownStencils } from "./stencil/MarkdownStencils";

export { markdownDefinition } from "./definition";
export { markdownDocDefinition, markdownDocPlugin } from "./doc";
export { markdownPlugin } from "./plugin";
