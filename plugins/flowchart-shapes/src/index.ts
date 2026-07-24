// flowchart 18 図形の外部パッケージ。core から完全移設し、tier 2 の frame 系ベース実装
// (createFrameObject / createFrameBehavior / createFrameMapper / createFrameObjectFactory /
// createFrame*Validator / AUTO_COLOR / DEFAULT_FONT_FAMILY / formatPolygonPoints /
// centeredPolygonOutline / OUTLINE_CURVE_SEGMENTS) を `@workspace/canvas/unstable` 経由で利用する。
// 各 definition は core の対応エントリ(initializeObjectRegistry.ts)と同一構成(意図的除外ゼロ)。
// process / onPageConnector プリセットは core 所有のまま(flowchartToolbarEntry から presetId で参照)。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./definitions";
export { flowchartParserExtensions } from "./parser";
export { flowchartToolbarEntry } from "./stencil/FlowchartToolbarEntry";
export { flowchartPlugin } from "./plugin";
