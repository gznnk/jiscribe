// UC1 実験: container 図形の追い出し先パッケージ。tier 2 移植済み(frame 系ベース実装
// createFrameObject / createFrameBehavior / createFrameMapper / createFrameShapeFactory /
// createFrame*Validator / resolveAutoColor / AUTO_COLOR / DEFAULT_FONT_FAMILY / PRECISION を
// @workspace/canvas/unstable 経由で利用)。Phase A(custom-controls-design.md)で
// selectionControls(ヘッダー高さコントロール)も同じく unstable 経由の
// SelectionControlHandler / SelectionControlPill 等で移植済み。tier 3
// (custom-menu-design.md)で ObjectMenu UI キット(ObjectMenuDropdownPanel / ObjectMenuColorPickerGrid /
// useCanvasMessages 等)も unstable 経由で公開され、header-color メニューも移植済み。
// containerDefinition は core の container 定義と同一構成(意図的除外ゼロ)。
// i18n は (a) 方式(menuHeaderColor は core の CanvasMessageStrings キーを読み続ける)。
// (docs/05_extensibility/uc1-container-extraction-log.md 参照)。
export * from "./schema/ContainerDoc";
export { ContainerShapeFactory } from "./schema/ContainerShapeFactory";
export { validateContainerDoc } from "./schema/validateContainerDoc";

export * from "./state/ContainerState";
export { containerToDoc, containerToState } from "./state/ContainerMapper";
export { isValidContainerState } from "./state/validateContainerState";

export { Container } from "./presentation/Container";
export { calcContainerHeaderHeight } from "./presentation/calcContainerHeaderHeight";
export { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";

export { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
export { HeaderHeightControlHandler } from "./controls/HeaderHeightControlHandler";

export { ContainerShapePresets } from "./ui/ContainerShapePresets";

export { containerDefinition } from "./definition";
export { containerPlugin } from "./plugin";
