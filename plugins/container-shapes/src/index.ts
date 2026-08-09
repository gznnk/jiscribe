// UC1: container 図形の外部パッケージ。tier 2 の frame 系ベース実装を利用する。
// ObjectDocDefinition / ObjectTypeDefinition は createFrameObjectDoc /
// createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`)
// が features/defaults から丸ごと導出するため、ObjectFactory / validateContainerDoc /
// Mapper / validateContainerState は持たない。schema/** の headless 部品
// (validateOptionalNumber / AUTO_COLOR / DEFAULT_FONT_FAMILY) は
// `@jiscribe/canvas-sdk/doc`、presentation / controls / menu 部品
// (createFrameObject / resolveAutoColor / PRECISION / ObjectMenuDropdownPanel /
// useCanvasMessages 等) は `@jiscribe/canvas-sdk` 経由。selectionControls(ヘッダー高さコントロール、handle は
// プレーン関数)と header-color メニューも移植済み。headless な parse 入口は ./doc
// (containerDocPlugin)。containerDefinition は core の container 定義と同一構成
// (意図的除外ゼロ)。i18n はプラグイン所有辞書(src/messages/containerMessages.ts)を canvas の
// locale から resolveLocaleMessages で解決する(menuHeaderColor は core から撤去済み)。
// (packages/canvas/docs/13-authoring-plugins.md 参照)。
export * from "./schema/ContainerDoc";
export * from "./state/ContainerState";

export { Container } from "./presentation/Container";
export { calcContainerHeaderHeight } from "./presentation/calcContainerHeaderHeight";
export { calcContainerTextRegion } from "./presentation/calcContainerTextRegion";

export { ContainerHeaderHeightControl } from "./controls/ContainerHeaderHeightControl";
export { handleContainerHeaderHeight } from "./controls/handleContainerHeaderHeight";

export { ContainerStencils } from "./stencil/ContainerStencils";
export { containerToolbarEntry } from "./stencil/ContainerToolbarEntry";

export { containerDefinition } from "./definition";
export { containerDocDefinition, containerDocPlugin } from "./doc";
export { containerPlugin } from "./plugin";
