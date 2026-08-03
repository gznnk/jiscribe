// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { ContainerFeatures } from "./schema/ContainerDoc";
import { ContainerObjectFactory } from "./schema/ContainerObjectFactory";
import { validateContainerDoc } from "./schema/validateContainerDoc";

export const containerDocDefinition: ObjectDocDefinition = {
	features: ContainerFeatures,
	validateDoc: validateContainerDoc,
	factory: ContainerObjectFactory,
};

/**
 * Headless `CanvasDocPlugin` for the container shape: the doc-layer view of
 * `containerPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
 */
export const containerDocPlugin: CanvasDocPlugin = {
	id: "container-shapes",
	objects: { container: containerDocDefinition },
};
