// flowchart 18 図形の外部パッケージ。core から完全移設し、tier 2 の frame 系ベース実装を利用する。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// validateOptionalNumber / AUTO_COLOR / DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、
// presentation / state / stencil 部品 (createFrameObject / createFrameBehavior / createFrameMapper /
// createFrameStateValidator / formatPolygonPoints / centeredPolygonOutline /
// OUTLINE_CURVE_SEGMENTS) は `@workspace/canvas/unstable` 経由。headless な parse 入口は ./doc
// (flowchartDocPlugin)。各 definition は core の対応エントリ(initializeObjectRegistry.ts)と
// 同一構成(意図的除外ゼロ)。process / onPageConnector プリセットは core 所有のまま
// (flowchartToolbarEntry から presetId で参照)。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./definitions";
export { flowchartDocPlugin } from "./doc";
export { flowchartToolbarEntry } from "./stencil/FlowchartToolbarEntry";
export { flowchartPlugin } from "./plugin";
