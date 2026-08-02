// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の Node 側
// 診断など、definition.ts（React コンポーネントを含む）を経由せずに parse-time 検証へ
// 参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas/unstable-doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { ACTOR_DOC_DEFAULTS, ActorFeatures } from "./schema/ActorDoc";
import { ActorObjectFactory } from "./schema/ActorObjectFactory";
import { validateActorDoc } from "./schema/validateActorDoc";

export const actorDocDefinition: ObjectDocDefinition = {
	features: ActorFeatures,
	validateDoc: validateActorDoc,
	factory: ActorObjectFactory,
	description:
		"Actor (stick figure) shape, typically used for users/roles in use-case diagrams or stakeholders in business diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a stick figure. The stick figure fills the whole box, and the text is drawn as a label below the box, auto-sized to the text itself (so it stays readable at any box size and does not need the box widened for it). A portrait aspect ratio (e.g. 80x100) looks best.",
	summary: "user, role, stakeholder",
	defaults: ACTOR_DOC_DEFAULTS,
};

/**
 * Headless `CanvasDocPlugin` for the general shapes: the doc-layer view of
 * `generalPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1).
 */
export const generalDocPlugin: CanvasDocPlugin = {
	id: "general-shapes",
	objects: { actor: actorDocDefinition },
};
