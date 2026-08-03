// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil / menu を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";
import { createFrameObjectDoc } from "@workspace/canvas-sdk/doc";

import { STICKY_DOC_DEFAULTS, StickyFeatures } from "./schema/StickyDoc";

export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
	description: "Sticky note annotation.",
	summary: "sticky note (no stroke or `rx`)",
	// Stickies are only center-placed on click (no bounds drawing).
	supportsBounds: false,
});

/**
 * Headless `CanvasDocPlugin` for the sticky shape: the doc-layer view of
 * `stickyPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code.
 */
export const stickyDocPlugin: CanvasDocPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDocDefinition },
};
