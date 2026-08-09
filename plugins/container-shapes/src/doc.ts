// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @jiscribe/canvas/doc /
// @jiscribe/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";

import {
	CONTAINER_DOC_DEFAULTS,
	ContainerFeatures,
} from "./schema/ContainerDoc";
import { validateContainerHeaderFields } from "./schema/validateContainerHeaderFields";

export const containerDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: ContainerFeatures,
		defaults: CONTAINER_DOC_DEFAULTS,
		description:
			'Container ("frame") shape: a titled rectangle that marks off a region of the diagram, typically a module, subsystem or bounded context. Uses the same rect-based geometry (x/y/width/height) as RectDoc. `text` is the title and is drawn in the top header band, never in the body; the body is click-through, so objects lying over it stay directly selectable. Objects are put inside it by geometry alone: give them coordinates within the box and place them after the container in `root` so they paint on top. A container has no `children` and does not carry its contents when it moves — wrap them in a GroupDoc when they must move together. The palette entries Frame / Boundary / Zone are all this type: Boundary is a container with `strokeDashType: "dashed"`, Zone one with a tinted `fill`.',
		summary: "titled region (module, subsystem, boundary)",
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
