// sticky 図形の外部パッケージ。tier 2 の frame 系ベース実装を利用する。
// ObjectDocDefinition / ObjectTypeDefinition は createFrameObjectDoc /
// createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`)
// が features/defaults から丸ごと導出するため、StickyObjectFactory /
// validateStickyDoc / StickyMapper / validateStickyState は持たない。schema/** の
// headless 部品 (DEFAULT_FONT_FAMILY) は `@jiscribe/canvas-sdk/doc`、
// presentation / menu 部品 (TextOverlay / calcTextRegion / createSvgTransform /
// ObjectMenu UI キット) は `@jiscribe/canvas-sdk` 経由。付箋の影に使うぼかしフィルタは
// `ObjectTypeDefinition.svgDefs` でキャンバスの <defs> へ提供する。
// headless な parse 入口は ./doc (stickyDocPlugin)。
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
