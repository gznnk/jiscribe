// 注釈図形の外部パッケージ。収載の線引きは「記法に属さない汎用注釈」で、flowchart / UML
// のような特定記法の語彙（それぞれ専用パッケージ）とも、実物・人・場を表すピクトグラム
// （general-shapes）とも分ける。callout もここへ移す計画で、複数図形になる前提の器として
// 複数形で始めている（docs/05_extensibility/annotation-plugin-plan.md 参照）。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / BELOW_LABEL_STYLE_DEFAULTS / TEXT_LINE_HEIGHT) は
// `@workspace/canvas/unstable-doc`、presentation / state / controls 部品
// (createFrameObject / createFrameBehavior / createFrameMapper /
// createFrameStateValidator / measureTextWidth / calcVisualLineCount /
// readTextSlot / SelectionControlPill) は `@workspace/canvas/unstable` 経由。
// headless な parse 入口は ./doc (annotationDocPlugin)。
// 図形は 1 図形 1 フォルダ（schema/<id>/ ・ state/<id>/ ・ presentation/<Pascal>/）で、
// 複数図形が共有する部品は各層の shared/ に置く。brace / bracket / bracketWithStem は
// 「向きを持つ帯＋その外側に出るラベル」という同じ構成なので、幾何・ラベル・描画の
// 骨組みと選択コントロールは group marker として共有し、図形ごとのフォルダにはパスの
// 作り方だけを置く。選択コントロールは stencil/ と同じく型名プレフィックスのフラット配置
// （controls/）。
// ツールバーは 3 図形をまとめた annotationToolbarEntry（カテゴリ）で出す。
export * from "./schema/shared/GroupMarkerFields";
export {
	validateGroupMarkerDirection,
	validateGroupMarkerTipFields,
} from "./schema/shared/validateGroupMarkerFields";

export * from "./schema/brace/BraceDoc";
export { BraceObjectFactory } from "./schema/brace/BraceObjectFactory";
export { validateBraceDoc } from "./schema/brace/validateBraceDoc";

export * from "./schema/bracket/BracketDoc";
export { BracketObjectFactory } from "./schema/bracket/BracketObjectFactory";
export { validateBracketDoc } from "./schema/bracket/validateBracketDoc";

export * from "./schema/bracketWithStem/BracketWithStemDoc";
export { BracketWithStemObjectFactory } from "./schema/bracketWithStem/BracketWithStemObjectFactory";
export { validateBracketWithStemDoc } from "./schema/bracketWithStem/validateBracketWithStemDoc";

export * from "./state/brace/BraceState";
export { braceToDoc, braceToState } from "./state/brace/BraceMapper";
export { isValidBraceState } from "./state/brace/validateBraceState";

export * from "./state/bracket/BracketState";
export { bracketToDoc, bracketToState } from "./state/bracket/BracketMapper";
export { isValidBracketState } from "./state/bracket/validateBracketState";

export * from "./state/bracketWithStem/BracketWithStemState";
export {
	bracketWithStemToDoc,
	bracketWithStemToState,
} from "./state/bracketWithStem/BracketWithStemMapper";
export { isValidBracketWithStemState } from "./state/bracketWithStem/validateBracketWithStemState";

export * from "./state/shared/GroupMarkerControlState";

export * from "./presentation/shared";
export * from "./presentation/Brace";
export * from "./presentation/Bracket";
export * from "./presentation/BracketWithStem";

export {
	GroupMarkerTipControl,
	handleGroupMarkerDirection,
	handleGroupMarkerTip,
} from "./controls";

export { BraceIcon } from "./stencil/BraceIcon";
export { BraceStencils } from "./stencil/BraceStencils";
export { BracketIcon } from "./stencil/BracketIcon";
export { BracketStencils } from "./stencil/BracketStencils";
export { BracketWithStemIcon } from "./stencil/BracketWithStemIcon";
export { BracketWithStemStencils } from "./stencil/BracketWithStemStencils";
export { annotationToolbarEntry } from "./stencil/AnnotationToolbarEntry";

export {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
} from "./definitions";
export {
	annotationDocPlugin,
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
} from "./doc";
export { annotationPlugin } from "./plugin";
