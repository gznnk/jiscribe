// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definitions.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas/unstable-doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { BRACE_DOC_DEFAULTS, BraceFeatures } from "./schema/brace/BraceDoc";
import { BraceObjectFactory } from "./schema/brace/BraceObjectFactory";
import { validateBraceDoc } from "./schema/brace/validateBraceDoc";

export const braceDocDefinition: ObjectDocDefinition = {
	features: BraceFeatures,
	validateDoc: validateBraceDoc,
	factory: BraceObjectFactory,
	description:
		'Curly brace shape, used to mark a run of shapes as one group and name it. Uses the same rect-based geometry (x/y/width/height) as RectDoc, but the box is the bracket alone: its short side is how far the curve bulges, its long side how far the arms reach. "direction" is the way the tip points, away from what is being grouped — a "left" brace is the typographic "{" and groups what is to its right, so place the box just left of that run and give it a small width (e.g. 24x160). "tipPosition" (0..1) moves the tip along the span, from the top for a left/right brace and from the left for an up/down one. Text is drawn as a label just beyond the tip, auto-sized to the text itself and outside the box, so the box stays a thin band however long the label is. The brace has no fill.',
	summary: "group marker, grouping annotation",
	defaults: BRACE_DOC_DEFAULTS,
};

/**
 * Headless `CanvasDocPlugin` for the annotation shapes: the doc-layer view of
 * `annotationPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
 */
export const annotationDocPlugin: CanvasDocPlugin = {
	id: "annotation-shapes",
	objects: {
		brace: braceDocDefinition,
	},
};
