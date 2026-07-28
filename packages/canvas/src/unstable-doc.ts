/**
 * Headless (UI-independent) implementation-detail layer of `@workspace/canvas`,
 * exposed for plugin authors building frame-family object types (#144 tier 2).
 *
 * The counterpart to `./unstable`, split off so the schema-side helpers a plugin's
 * `schema/**` and `doc.ts` need (doc factory / doc validator / doc-default
 * constants) carry no react / @emotion / presentation / controller dependency, and
 * a Node-side consumer (VSCode DiagnosticProvider) can pull a plugin's doc entry
 * without dragging the React UI into its bundle. Like `./unstable`, this is NOT
 * covered by semver compatibility guarantees.
 */

export { createFrameObjectFactory } from "./schemas/objects/utils/createFrameObjectFactory";

export { createFrameDocValidator } from "./schemas/objects/utils/createFrameDocValidator";
export {
	validateOptionalNumber,
	// A `text: "slots"` type validates its own slots, and their styling is the
	// same six fields the single-body form has, checked by the same rules.
	validateTextSlotStyleFields,
} from "./schemas/objects/utils/validateDocUtils";
export type { ObjectDocValidateFn } from "./schemas/registry/ObjectDocValidatorRegistry";

export { AUTO_COLOR } from "./schemas/objects/utils/autoColor";

export { DEFAULT_FONT_FAMILY } from "./constants/defaultFontFamily";

// 表示(TextOverlayFrame)と編集(TextEditor)が共有する line-height。行単位の寸法を
// 自前で持つ図形（record の行高など）は、描画される行の高さとずれないように
// この値から行高を作る。
export { TEXT_LINE_HEIGHT } from "./constants/textLineHeight";
