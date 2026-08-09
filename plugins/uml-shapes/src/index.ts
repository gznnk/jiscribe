// UML 系図形の外部パッケージ。最初の図形は record（区画付きボックス）で、
// 「1 図形に複数のテキストスロット」機構が公開 API だけで成立することの実証を兼ねる
// （スロット集合の正本は state.text のキー、領域は textRegion calculator が slotId から返す）。
// ObjectDocDefinition は createFrameObjectDoc (`@jiscribe/canvas-sdk/doc`) が
// features/defaults から導出するため RecordObjectFactory / validateRecordDoc は
// 持たない。ObjectTypeDefinition は createFrameObjectDefinition を使わず直書き:
// mapper がスロット正規形を被せた派生版のため (RecordMapper 参照)。schema/** の
// headless 部品 (validateTextSlotStyleFields / AUTO_COLOR / DEFAULT_FONT_FAMILY /
// TEXT_LINE_HEIGHT) は `@jiscribe/canvas-sdk/doc`、presentation / state 部品
// (createFrameObject / TextOverlay / createFrameBehavior / createFrameMapper /
// createFrameStateValidator) は `@jiscribe/canvas-sdk` 経由。
// headless な parse 入口は ./doc (umlDocPlugin)。
// (packages/canvas/docs/13-authoring-plugins.md 参照)。
export * from "./schema/RecordDoc";
export * from "./state/RecordState";
export { recordToDoc, recordToState } from "./state/RecordMapper";
export { isValidRecordState } from "./state/validateRecordState";

export { RecordBox } from "./presentation/RecordBox";
export { calcRecordSlotRegions } from "./presentation/calcRecordSlotRegions";
export type {
	RecordSlotRegions,
	RecordSlotRegionsState,
} from "./presentation/calcRecordSlotRegions";
export { calcRecordTextRegion } from "./presentation/calcRecordTextRegion";

export { RecordStencils } from "./stencil/RecordStencils";
export { umlToolbarEntry } from "./stencil/UmlToolbarEntry";

export { recordDefinition } from "./definition";
export { recordDocDefinition, umlDocPlugin } from "./doc";
export { umlPlugin } from "./plugin";
