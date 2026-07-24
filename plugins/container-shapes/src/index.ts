// UC1: container 図形の外部パッケージ。tier 2 の frame 系ベース実装
// (createFrameObject / createFrameBehavior / createFrameMapper / createFrameObjectFactory /
// createFrame*Validator / resolveAutoColor / AUTO_COLOR / DEFAULT_FONT_FAMILY / PRECISION)、
// selectionControls(ヘッダー高さコントロール、handle はプレーン関数)、ObjectMenu UI キット
// (ObjectMenuDropdownPanel / ObjectMenuColorPickerGrid / useCanvasMessages 等)を
// いずれも @workspace/canvas/unstable 経由で利用し、header-color メニューも移植済み。
// containerDefinition は core の container 定義と同一構成(意図的除外ゼロ)。
// i18n はプラグイン所有辞書(src/messages/containerMessages.ts)を canvas の locale
// から resolveLocaleMessages で解決する(menuHeaderColor は core から撤去済み)。
// (docs/05_extensibility/plugin-architecture-requirements.md §4 UC1 参照)。
export * from "./schema/ContainerDoc";
export { ContainerObjectFactory } from "./schema/ContainerObjectFactory";
export { validateContainerDoc } from "./schema/validateContainerDoc";

export * from "./state/ContainerState";
export { containerToDoc, containerToState } from "./state/ContainerMapper";
export { isValidContainerState } from "./state/validateContainerState";

export { Container } from "./presentation/Container";
export { calcContainerHeaderHeight } from "./presentation/calcContainerHeaderHeight";
export { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";

export { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
export { handleContainerHeaderHeight } from "./controls/handleContainerHeaderHeight";

export { ContainerStencils } from "./stencil/ContainerStencils";
export { containerToolbarEntry } from "./stencil/ContainerToolbarEntry";

export { containerDefinition } from "./definition";
export { containerPlugin } from "./plugin";
