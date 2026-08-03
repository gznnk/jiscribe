// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas/unstable-doc のみで、presentation / state / stencil / menu を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { STICKY_DOC_DEFAULTS, StickyFeatures } from "./schema/StickyDoc";
import { StickyObjectFactory } from "./schema/StickyObjectFactory";
import { validateStickyDoc } from "./schema/validateStickyDoc";

export const stickyDocDefinition: ObjectDocDefinition = {
	features: StickyFeatures,
	validateDoc: validateStickyDoc,
	factory: StickyObjectFactory,
	description: "Sticky note annotation.",
	summary: "sticky note (no stroke or `rx`)",
	defaults: STICKY_DOC_DEFAULTS,
};

/**
 * Headless `CanvasDocPlugin` for the sticky shape: the doc-layer view of
 * `stickyPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code.
 */
export const stickyDocPlugin: CanvasDocPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDocDefinition },
};
