// 汎用ピクトグラムの外部パッケージ。収載の線引きは「記法に属さない、実物・人・場を
// 表す図形」で、flowchart / UML のような特定記法の語彙（それぞれ専用パッケージ）とも、
// 装飾系（star / heart / バナー等。図に意味を足さない）とも分ける。現在の所属は actor
// のみで、cloud は core に残っているが後続でここへ移設予定（generalToolbarEntry は
// presetId 参照なので、移設の前後どちらでも同じ並びで出る）。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、presentation /
// state 部品 (createFrameObject / createFrameBehavior / createFrameMapper /
// createFrameStateValidator / measureTextWidth / calcVisualLineCount / readTextSlot) は
// `@workspace/canvas/unstable` 経由。headless な parse 入口は ./doc (generalDocPlugin)。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./schema/ActorDoc";
export { ActorObjectFactory } from "./schema/ActorObjectFactory";
export { validateActorDoc } from "./schema/validateActorDoc";

export * from "./state/ActorState";
export { actorToDoc, actorToState } from "./state/ActorMapper";
export { isValidActorState } from "./state/validateActorState";

export { Actor } from "./presentation/Actor";
export { buildActorFigure } from "./presentation/buildActorFigure";
export type { ActorFigure } from "./presentation/buildActorFigure";
export {
	ACTOR_LABEL_GAP,
	calcActorTextRegion,
} from "./presentation/calcActorTextRegion";
export { calcActorVisualBounds } from "./presentation/calcActorVisualBounds";

export { ActorStencils } from "./stencil/ActorStencils";
export { generalToolbarEntry } from "./stencil/GeneralToolbarEntry";

export { actorDefinition } from "./definition";
export { actorDocDefinition, generalDocPlugin } from "./doc";
export { generalPlugin } from "./plugin";
