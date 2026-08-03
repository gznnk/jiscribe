// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { MarkdownFeatures } from "./schema/MarkdownDoc";
import { MarkdownObjectFactory } from "./schema/MarkdownObjectFactory";
import { validateMarkdownDoc } from "./schema/validateMarkdownDoc";

export const markdownDocDefinition: ObjectDocDefinition = {
	features: MarkdownFeatures,
	validateDoc: validateMarkdownDoc,
	factory: MarkdownObjectFactory,
	// The schema $def is a handwritten template (nearly every property description
	// is Markdown-specific), so only summary is consumed — it fills the generated
	// doc tables.
	summary: "Markdown-rendered document card",
};

/**
 * Headless `CanvasDocPlugin` for the markdown shape: the doc-layer view of
 * `markdownPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code — which also keeps markdown-it / KaTeX out of the
 * Node-side bundle, since only the presentation renders Markdown.
 */
export const markdownDocPlugin: CanvasDocPlugin = {
	id: "markdown-shape",
	objects: { markdown: markdownDocDefinition },
};
