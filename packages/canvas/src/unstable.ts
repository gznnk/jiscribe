/**
 * Implementation-detail layer of `@workspace/canvas`, exposed for plugin authors
 * (#144 tier 2: frame 系ベース実装). Unlike the stable API (`.`), this is NOT
 * covered by semver compatibility guarantees and may change without notice.
 */

export { createFrameObject } from "./presentations/objects/base/createFrameObject";
export type { FrameShapeProps } from "./presentations/objects/base/createFrameObject";
export type { TextEditable } from "./presentations/objects/base/TextOverlay/TextOverlay";

export { createFrameBehavior } from "./controllers/gestures/handlers/objects/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

export { createFrameShapeFactory } from "./schemas/objects/utils/createFrameShapeFactory";

export { createFrameStateValidator } from "./states/objects/utils/createFrameStateValidator";
export type { StateRecord } from "./states/objects/utils/validateStateUtils";

export { createFrameDocValidator } from "./schemas/objects/utils/createFrameDocValidator";
export { validateOptionalNumber } from "./schemas/objects/utils/validateDocUtils";
export type { ObjectDocValidateFn } from "./schemas/registry/ObjectDocValidatorRegistry";

export { resolveAutoColor } from "./presentations/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./presentations/objects/utils/resolveAutoColor";

export { AUTO_COLOR } from "./schemas/objects/utils/autoColor";

export { DEFAULT_FONT_FAMILY } from "./constants/defaultFontFamily";

export { PRECISION } from "./constants/precision";
