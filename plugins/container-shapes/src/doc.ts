// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";
import { createFrameObjectDoc } from "@workspace/canvas-sdk/doc";

import {
	CONTAINER_DOC_DEFAULTS,
	ContainerFeatures,
} from "./schema/ContainerDoc";
import { validateContainerHeaderFields } from "./schema/validateContainerHeaderFields";

export const containerDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: ContainerFeatures,
		defaults: CONTAINER_DOC_DEFAULTS,
		validateExtra: validateContainerHeaderFields,
	},
);

/**
 * Headless `CanvasDocPlugin` for the container shape: the doc-layer view of
 * `containerPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
 */
export const containerDocPlugin: CanvasDocPlugin = {
	id: "container-shapes",
	objects: { container: containerDocDefinition },
};
