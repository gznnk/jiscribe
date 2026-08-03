// sticky 図形の外部パッケージ。tier 2 の frame 系ベース実装を利用する。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、presentation / state /
// menu 部品 (createFrameBehavior / createFrameMapper / createFrameStateValidator /
// TextOverlay / calcTextRegion / createSvgTransform / ObjectMenu UI キット) は
// `@workspace/canvas/unstable` 経由。付箋の影に使うぼかしフィルタは
// `ObjectTypeDefinition.svgDefs` でキャンバスの <defs> へ提供する。
// headless な parse 入口は ./doc (stickyDocPlugin)。
export * from "./schema/StickyDoc";
export { StickyObjectFactory } from "./schema/StickyObjectFactory";
export { validateStickyDoc } from "./schema/validateStickyDoc";

export * from "./state/StickyState";
export { stickyToDoc, stickyToState } from "./state/StickyMapper";
export { isValidStickyState } from "./state/validateStickyState";

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
