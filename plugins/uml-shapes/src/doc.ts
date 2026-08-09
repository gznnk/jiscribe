// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @jiscribe/canvas/doc /
// @jiscribe/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";

import { RECORD_DOC_DEFAULTS, RecordFeatures } from "./schema/RecordDoc";
import { validateRecordTextFields } from "./schema/validateRecordTextFields";

export const recordDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: RecordFeatures,
	defaults: RECORD_DOC_DEFAULTS,
	// The schema $def is a handwritten template (text is a slotted object), so
	// only summary is consumed — it fills the generated doc tables.
	summary: "titled box + row compartments (UML class / ER entity)",
	validateExtra: validateRecordTextFields,
});

/**
 * Headless `CanvasDocPlugin` for the UML shapes: the doc-layer view of
 * `umlPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const umlDocPlugin: CanvasDocPlugin = {
	id: "uml-shapes",
	objects: { record: recordDocDefinition },
};
