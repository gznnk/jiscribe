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
// 複数図形が共有する部品は各層の shared/ に置く。選択コントロールだけは stencil/ と
// 同じく型名プレフィックスのフラット配置（controls/）。
// ツールバーはまだカテゴリを作らず preset を直接 pin する運用（2 図形目が入る時点で
// カテゴリ entry を作る）。
export * from "./schema/brace/BraceDoc";
export { BraceObjectFactory } from "./schema/brace/BraceObjectFactory";
export { validateBraceDoc } from "./schema/brace/validateBraceDoc";

export * from "./state/brace/BraceState";
export { braceToDoc, braceToState } from "./state/brace/BraceMapper";
export { isValidBraceState } from "./state/brace/validateBraceState";

export * from "./presentation/Brace";

export { BraceTipControl, handleBraceTip } from "./controls";

export { BraceIcon } from "./stencil/BraceIcon";
export { BraceStencils } from "./stencil/BraceStencils";

export { braceDefinition } from "./definitions";
export { annotationDocPlugin, braceDocDefinition } from "./doc";
export { annotationPlugin } from "./plugin";
