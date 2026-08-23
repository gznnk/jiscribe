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
export { DEFAULT_FONT_FAMILY } from "./text/style/fontFamilies";
// The closed set a document may name, for a doc-side validator or a shape
// choosing its own default. Carries no UI dependency, so it belongs on this
// entry as well as the root — a plugin's `schema/**` cannot reach the root.
export { CANVAS_FONT_FAMILIES } from "./text/style/fontFamilies";
export type {
	CanvasFontFamily,
	CanvasFontFamilyId,
} from "./text/style/fontFamilies";

// What a text style field is drawn with when neither the slot nor the type
// declares one. A host resolving a slot's typography itself — a headless
// measurement is the case in hand — needs the same last resort the drawing uses,
// or it measures at a size nothing is drawn at.
export { TEXT_STYLE_FALLBACK } from "./text/style/textStyleFallback";

// line-height shared by display (TextOverlayFrame) and editing (TextEditor). Shapes that
// carry their own per-row dimensions must derive row height from this value, or their rows
// drift from the rendered line height.
export { TEXT_LINE_HEIGHT } from "./text/layout/textLineHeight";

// Inner padding of the box the canvas draws text in. Shapes that size a text box
// themselves must reserve this much, or the padding the CSS applies eats into the
// text and clips it.
export {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "./text/block/textBoxPadding";

// The slot id of a `text: "body"` type's single text, for a headless consumer
// resolving a type's text region (`ObjectDocDefinition.textRegion`), which takes
// a slot id as the rendering layer's does.
export { BODY_TEXT_SLOT_ID } from "./text/style/textSlotId";

// Text measurement, which the wrapping and the box sizes both follow from. Headless
// because it needs no DOM of its own: layoutVisualLines reproduces the display-side
// CSS (pre-wrap + break-word) from character widths alone, and where those widths
// come from is whatever a host offered (offerTextMeasurement) — @jiscribe/canvas
// offers its own offscreen canvas as it is imported, @jiscribe/doc-tools offers the
// bundled font files read through fontkit, and a host that offers neither has to
// say so with createEstimateTextMeasurement. Measuring with nothing offered throws.
// The height a shape with no `height` in the document is drawn at, and the box
// its text is laid out in once the padding is off the declared region. Both are
// headless for the same reason the measurement is.
export { AUTO_HEIGHT_COMFORT_PADDING_EM } from "./text/block/autoHeightComfortPadding";
export { calcAutoShapeHeight } from "./text/block/calcAutoShapeHeight";
export type { AutoHeightShape } from "./text/block/calcAutoShapeHeight";
export { calcTextContentBox } from "./text/block/calcTextContentBox";
// The one place the two vertical bases are told apart, shared so that the
// overlay, the editor, image export and the fit checks place a body alike.
export { applyTextVerticalBasis } from "./text/block/applyTextVerticalBasis";
export { calcVisualLineCount } from "./text/layout/calcVisualLineCount";
export { calcVisualTextHeight } from "./text/layout/calcVisualTextHeight";
export { layoutVisualLines } from "./text/layout/layoutVisualLines";
export { measureTextWidth } from "./text/layout/measureTextWidth";
export type { VisualLine } from "./text/layout/VisualLine";
export type { TextMeasureFont } from "./text/measure/TextMeasureFont";
export { createEstimateTextMeasurement } from "./text/measure/TextMeasurement";
export type {
	TextMeasurement,
	TextMeasurementSource,
} from "./text/measure/TextMeasurement";
export {
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "./text/measure/textMeasurementSlot";
export type { TextWidthMeasurer } from "./text/measure/textWidthMeasurer";
