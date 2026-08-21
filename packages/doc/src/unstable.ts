/**
 * Implementation-detail layer of `@jiscribe/doc`, exposed for plugin authors
 * building frame-family object types (#144 tier 2).
 *
 * The counterpart to `@jiscribe/canvas/unstable`, split off so the doc-side helpers
 * a plugin's `schema/**` and `doc.ts` need (doc factory / doc validator / doc-default
 * constants) carry no react / @emotion / rendering / control dependency, and
 * a Node-side consumer (VSCode DiagnosticProvider) can pull a plugin's doc entry
 * without dragging the React UI into its bundle. Like `@jiscribe/canvas/unstable`,
 * this is NOT covered by semver compatibility guarantees.
 */

export { createFrameObjectFactory } from "./model/objects/utils/createFrameObjectFactory";

// The point-geometry counterpart: a doc storing a drawn top-left position only, the
// box being derived from the content by the type's `contentResizer` in the state layer.
export { createPointObjectFactory } from "./model/objects/utils/createPointObjectFactory";

// The bounds+minSize guard every `createDocFromBounds` needs, for shapes that
// cannot use createFrameObjectFactory (center origin, vertex lists).
export {
	calcDrawBounds,
	DEFAULT_MIN_DRAW_SIZE,
} from "./model/objects/utils/calcDrawBounds";
export type { DrawBounds } from "./model/objects/utils/calcDrawBounds";

export { createFrameDocValidator } from "./model/objects/utils/createFrameDocValidator";
export {
	validateOptionalNumber,
	// A `text: "slots"` type validates its own slots, and their styling is the
	// same six fields the single-body form has, checked by the same rules.
	validateTextSlotStyleFields,
	// A slot whose content is one body of text validates it with these: the runs
	// it may be styled in, and the styling one run can carry.
	validateInlineTextStyleFields,
	validateRichTextContent,
} from "./model/objects/utils/validateDocUtils";
export type { ObjectDocValidateFn } from "./plugin/ObjectDocValidatorRegistry";

export { AUTO_COLOR } from "./model/objects/utils/autoColor";

// The one family an unstyled slot is drawn and measured with, and the default a
// shape is created with. Nothing above can substitute another: only the shipped
// families measure faithfully (CANVAS_FONT_FAMILIES).
export { DEFAULT_FONT_FAMILY } from "./text/fontFamilies";
// The closed set a document may name, for a doc-side validator or a shape
// choosing its own default. Carries no UI dependency, so it belongs on this
// entry as well as the root — a plugin's `schema/**` cannot reach the root.
export { CANVAS_FONT_FAMILIES } from "./text/fontFamilies";
export type { CanvasFontFamily, CanvasFontFamilyId } from "./text/fontFamilies";

// What a text style field is drawn with when neither the slot nor the type
// declares one. A host resolving a slot's typography itself — a headless
// measurement is the case in hand — needs the same last resort the drawing uses,
// or it measures at a size nothing is drawn at.
export { TEXT_STYLE_FALLBACK } from "./text/textStyleFallback";

// line-height shared by display (TextOverlayFrame) and editing (TextEditor). Shapes that
// carry their own per-row dimensions must derive row height from this value, or their rows
// drift from the rendered line height.
export { TEXT_LINE_HEIGHT } from "./text/textLineHeight";

// Inner padding of the box the canvas draws text in. Shapes that size a text box
// themselves must reserve this much, or the padding the CSS applies eats into the
// text and clips it.
export { TEXT_BOX_PADDING_X, TEXT_BOX_PADDING_Y } from "./text/textBoxPadding";

// Text measurement, which the wrapping and the box sizes both follow from. Headless
// because it needs no DOM of its own: layoutVisualLines reproduces the display-side
// CSS (pre-wrap + break-word) from character widths alone, and where those widths
// come from is what setTextWidthMeasurerFactory decides — a browser measures on an
// offscreen canvas, a Node host registers a backend reading the bundled font files
// (@jiscribe/doc-tools), and with neither the widths fall back to an estimate.
export {
	calcVisualLineCount,
	calcVisualTextHeight,
	layoutVisualLines,
	measureTextWidth,
} from "./text/measureText";
export type { TextMeasureFont, VisualLine } from "./text/measureText";
export { setTextWidthMeasurerFactory } from "./text/textWidthMeasurer";
export type {
	TextWidthMeasurer,
	TextWidthMeasurerFactory,
} from "./text/textWidthMeasurer";
