// 注釈図形の外部パッケージ。収載の線引きは「記法に属さない汎用注釈」で、flowchart / UML
// のような特定記法の語彙（それぞれ専用パッケージ）とも、実物・人・場を表すピクトグラム
// （general-shapes）とも分ける（docs/05_extensibility/annotation-plugin-plan.md 参照）。
// 各図形の ObjectDocDefinition / ObjectTypeDefinition は createFrameObjectDoc /
// createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`)
// が features/defaults から丸ごと導出するため、per-shape の ObjectFactory /
// validate*Doc / Mapper / validate*State は持たない（group marker の factory だけは
// schema/shared/createGroupMarkerObjectFactory を渡して差し替える）。schema/** の
// headless 部品 (AUTO_COLOR / BELOW_LABEL_STYLE_DEFAULTS / TEXT_LINE_HEIGHT) は
// `@jiscribe/canvas-sdk/doc`、presentation / controls 部品 (createFrameObject /
// measureTextWidth / calcVisualLineCount / readTextSlot / centeredPolygonOutline /
// SelectionControlPill) は `@jiscribe/canvas-sdk` 経由。
// headless な parse 入口は ./doc (annotationDocPlugin)。
// 図形は 1 図形 1 フォルダ（schema/<id>/ ・ state/<id>/ ・ presentation/<Pascal>/）で、
// 複数図形が共有する部品は各層の shared/ に置く。brace / bracket / bracketWithStem は
// 「向きを持つ帯＋その外側に出るラベル」という同じ構成なので、幾何・ラベル・描画の
// 骨組みと選択コントロールは group marker として共有し、図形ごとのフォルダにはパスの
// 作り方だけを置く。選択コントロールは stencil/ と同じく型名プレフィックスのフラット配置
// （controls/）。callout と note はこの group marker 系ではなく、テキストを箱の中に持つ
// 独立した注記ボックスなので shared/ を使わず各自のフォルダで完結する（callout の tail は
// {side, position}、group marker の direction / tipPosition とは別のモデル）。
// ツールバーは 5 図形をまとめた annotationToolbarEntry（カテゴリ）で出す。
export * from "./schema/shared/GroupMarkerFields";
export {
	validateGroupMarkerDirection,
	validateGroupMarkerTipFields,
} from "./schema/shared/validateGroupMarkerFields";

export * from "./schema/brace/BraceDoc";
export * from "./schema/bracket/BracketDoc";
export * from "./schema/bracketWithStem/BracketWithStemDoc";
export * from "./schema/callout/CalloutDoc";
export * from "./schema/note/NoteDoc";

export * from "./state/brace/BraceState";
export * from "./state/bracket/BracketState";
export * from "./state/bracketWithStem/BracketWithStemState";
export * from "./state/callout/CalloutState";
export * from "./state/note/NoteState";
export * from "./state/shared/GroupMarkerControlState";

export * from "./presentation/shared";
export * from "./presentation/Brace";
export * from "./presentation/Bracket";
export * from "./presentation/BracketWithStem";
export * from "./presentation/Callout";
export * from "./presentation/Note";

export {
	CalloutTailTipControl,
	GroupMarkerTipControl,
	handleCalloutTailTip,
	handleGroupMarkerDirection,
	handleGroupMarkerTip,
} from "./controls";

export { BraceIcon } from "./stencil/BraceIcon";
export { BracketIcon } from "./stencil/BracketIcon";
export { BracketWithStemIcon } from "./stencil/BracketWithStemIcon";
export { CalloutIcon } from "./stencil/CalloutIcon";
export { NoteIcon } from "./stencil/NoteIcon";
export { annotationToolbarEntry } from "./stencil/AnnotationToolbarEntry";

export {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
	calloutDefinition,
	noteDefinition,
} from "./definitions";
export {
	annotationDocPlugin,
	braceDocDefinition,
	bracketDocDefinition,
	bracketWithStemDocDefinition,
	calloutDocDefinition,
	noteDocDefinition,
} from "./doc";
export { annotationPlugin } from "./plugin";
