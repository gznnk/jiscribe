// External package of the lucideIcon shape, built on the tier 2 frame-family base
// implementation: ObjectDocDefinition / ObjectTypeDefinition are derived wholesale from
// features/defaults by createFrameObjectDoc / createFrameObjectDefinition
// (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`).
//
// The drawings come from a committed data module generated out of the `lucide`
// devDependency (scripts/generateIconData.mjs), so nothing but that script reads the icon
// set and no build or runtime code depends on it. Name resolution is deliberately forgiving — a superseded
// or differently-spelled name still draws, and a name that resolves to nothing is
// reported with candidates (schema/validateIconName.ts).
//
// The headless parse entry point is ./doc (lucideIconDocPlugin).
export * from "./schema/IconDoc";
export * from "./state/IconState";

export type { IconNode } from "./schema/icon/IconNode";
export {
	ICON_ALIASES,
	ICON_NODES,
	LUCIDE_VERSION,
} from "./schema/icon/iconData.generated";
export { normalizeIconName } from "./schema/icon/normalizeIconName";
export {
	isKnownIconName,
	readIconNodes,
	resolveIconName,
} from "./schema/icon/resolveIconName";
export { COMMON_ICON_NAMES } from "./schema/icon/commonIconNames";
export { suggestIconNames } from "./schema/icon/suggestIconNames";
export { validateIconName } from "./schema/validateIconName";

export { Icon } from "./presentation/Icon";

export { IconGlyph } from "./menu/IconGlyph";
export { IconPickerMenu } from "./menu/IconPickerMenu";

export { IconStencilIcon } from "./stencil/IconStencilIcon";
export { IconStencils } from "./stencil/IconStencils";

export { lucideIconDefinition } from "./definition";
export { lucideIconDocDefinition, lucideIconDocPlugin } from "./doc";
export { lucideIconPlugin } from "./plugin";
