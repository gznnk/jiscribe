// 汎用ピクトグラムの外部パッケージ。収載の線引きは「記法に属さない、実物・人・場を
// 表す図形」で、flowchart / UML のような特定記法の語彙（それぞれ専用パッケージ）とも、
// 装飾系（star / heart / バナー等。図に意味を足さない）とも分ける。所属は actor と
// cloud で、どちらも core 残留ゼロ（generalToolbarEntry も両方をここから供給する）。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、presentation /
// state 部品 (createFrameObject / createFrameBehavior / createFrameMapper /
// createFrameStateValidator / measureTextWidth / calcVisualLineCount / readTextSlot /
// OUTLINE_CURVE_SEGMENTS) は `@workspace/canvas/unstable` 経由。headless な parse 入口は
// ./doc (generalDocPlugin)。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./schema/ActorDoc";
export { ActorObjectFactory } from "./schema/ActorObjectFactory";
export { validateActorDoc } from "./schema/validateActorDoc";
export * from "./schema/CloudDoc";
export { CloudObjectFactory } from "./schema/CloudObjectFactory";
export { validateCloudDoc } from "./schema/validateCloudDoc";

export * from "./state/ActorState";
export { actorToDoc, actorToState } from "./state/ActorMapper";
export { isValidActorState } from "./state/validateActorState";
export * from "./state/CloudState";
export { cloudToDoc, cloudToState } from "./state/CloudMapper";
export { isValidCloudState } from "./state/validateCloudState";

export { Actor } from "./presentation/Actor";
export { buildActorFigure } from "./presentation/buildActorFigure";
export type { ActorFigure } from "./presentation/buildActorFigure";
export {
	ACTOR_LABEL_GAP,
	calcActorTextRegion,
} from "./presentation/calcActorTextRegion";
export { calcActorVisualBounds } from "./presentation/calcActorVisualBounds";
export { Cloud } from "./presentation/Cloud";
export { buildCloudPath } from "./presentation/buildCloudPath";
export { calcCloudTextRegion } from "./presentation/calcCloudTextRegion";
export { cloudOutline } from "./presentation/cloudOutline";

export { ActorStencils } from "./stencil/ActorStencils";
export { CloudStencils } from "./stencil/CloudStencils";
export { generalToolbarEntry } from "./stencil/GeneralToolbarEntry";

export { actorDefinition, cloudDefinition } from "./definition";
export {
	actorDocDefinition,
	cloudDocDefinition,
	generalDocPlugin,
} from "./doc";
export { generalPlugin } from "./plugin";
