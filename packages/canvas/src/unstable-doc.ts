/**
 * Headless (UI-independent) implementation-detail layer of `@jiscribe/canvas`,
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

// The point-geometry counterpart: a doc storing a drawn top-left position only, the
// box being derived from the content by the type's `contentResizer` in the state layer.
export { createPointObjectFactory } from "./schemas/objects/utils/createPointObjectFactory";

// The bounds+minSize guard every `createDocFromBounds` needs, for shapes that
// cannot use createFrameObjectFactory (center origin, vertex lists).
export {
	calcDrawBounds,
	DEFAULT_MIN_DRAW_SIZE,
} from "./schemas/objects/utils/calcDrawBounds";
export type { DrawBounds } from "./schemas/objects/utils/calcDrawBounds";

export { createFrameDocValidator } from "./schemas/objects/utils/createFrameDocValidator";
export {
	validateOptionalNumber,
	// A `text: "slots"` type validates its own slots, and their styling is the
	// same six fields the single-body form has, checked by the same rules.
	validateTextSlotStyleFields,
	// A slot whose content is one body of text validates it with these: the runs
	// it may be styled in, and the styling one run can carry.
	validateInlineTextStyleFields,
	validateRichTextContent,
} from "./schemas/objects/utils/validateDocUtils";
export type { ObjectDocValidateFn } from "./schemas/registry/ObjectDocValidatorRegistry";

export { AUTO_COLOR } from "./schemas/objects/utils/autoColor";

export { DEFAULT_FONT_FAMILY } from "./constants/defaultFontFamily";

// line-height shared by display (TextOverlayFrame) and editing (TextEditor). Shapes that
// carry their own per-row dimensions must derive row height from this value, or their rows
// drift from the rendered line height.
export { TEXT_LINE_HEIGHT } from "./constants/textLineHeight";

// Inner padding of the box the canvas draws text in. Shapes that size a text box
// themselves must reserve this much, or the padding the CSS applies eats into the
// text and clips it.
export {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "./constants/textBoxPadding";
