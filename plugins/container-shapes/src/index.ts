// UC1: external package of the container shape. It builds on the tier 2 frame-family
// base implementation.
// ObjectDocDefinition / ObjectTypeDefinition are derived wholesale from features/defaults
// by createFrameObjectDoc / createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` /
// `@jiscribe/canvas-sdk`), so there is no ObjectFactory / validateContainerDoc / Mapper /
// validateContainerState. The headless parts of schema/** (validateOptionalNumber /
// AUTO_COLOR / DEFAULT_FONT_FAMILY) come from `@jiscribe/canvas-sdk/doc`; the
// presentation / controls / menu parts (createFrameObject / resolveAutoColor / PRECISION /
// ObjectMenuDropdownPanel / useCanvasMessages and so on) come through
// `@jiscribe/canvas-sdk`. selectionControls (the header-height control, whose handle is a
// plain function) and the header-color menu have been ported too. The headless parse
// entry point is ./doc (containerDocPlugin). containerDefinition matches the core
// container definition exactly (nothing is left out on purpose). For i18n, the
// plugin-owned dictionary (src/messages/containerMessages.ts) is resolved against the
// canvas locale with resolveLocaleMessages (menuHeaderColor has been removed from core).
// (See packages/canvas/docs/13-authoring-plugins.md.)
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
