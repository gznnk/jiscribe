// UML 系図形の外部パッケージ。最初の図形は record（区画付きボックス）で、
// 「1 図形に複数のテキストスロット」機構が公開 API だけで成立することの実証を兼ねる
// （スロット集合の正本は state.text のキー、領域は textRegion calculator が slotId から返す）。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / DEFAULT_FONT_FAMILY / TEXT_LINE_HEIGHT) は `@workspace/canvas/unstable-doc`、
// presentation / state 部品 (createFrameObject / TextOverlay / createFrameBehavior /
// createFrameMapper / createFrameStateValidator) は `@workspace/canvas/unstable` 経由。
// headless な parse 入口は ./doc (umlDocPlugin)。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./schema/RecordDoc";
export { RecordObjectFactory } from "./schema/RecordObjectFactory";
export { validateRecordDoc } from "./schema/validateRecordDoc";

export * from "./state/RecordState";
export { recordToDoc, recordToState } from "./state/RecordMapper";
export { isValidRecordState } from "./state/validateRecordState";

export { RecordBox } from "./presentation/RecordBox";
export { calcRecordSlotRegions } from "./presentation/calcRecordSlotRegions";
export type { RecordSlotRegions } from "./presentation/calcRecordSlotRegions";
export { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";

export { RecordStencils } from "./stencil/RecordStencils";
export { umlToolbarEntry } from "./stencil/UmlToolbarEntry";

export { recordDefinition } from "./definition";
export { recordDocDefinition, umlDocPlugin } from "./doc";
export { umlPlugin } from "./plugin";
