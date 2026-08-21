// Re-export shim for the headless implementation-detail layer, which lives in its own
// package now (`@jiscribe/doc/unstable`). Kept so plugin authors reaching it through
// `@jiscribe/canvas-sdk/doc` keep working while they migrate. Like the entry it
// forwards to, this is NOT covered by semver guarantees.
//
// Listed rather than star-exported, for the reason spelled out in ./doc.ts.

export {
	createFrameObjectFactory,
	createPointObjectFactory,
	calcDrawBounds,
	DEFAULT_MIN_DRAW_SIZE,
	createFrameDocValidator,
	validateOptionalNumber,
	validateTextSlotStyleFields,
	validateInlineTextStyleFields,
	validateRichTextContent,
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
	CANVAS_FONT_FAMILIES,
	TEXT_STYLE_FALLBACK,
	TEXT_LINE_HEIGHT,
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
	calcVisualLineCount,
	calcVisualTextHeight,
	layoutVisualLines,
	measureTextWidth,
	setTextWidthMeasurerFactory,
} from "@jiscribe/doc/unstable";
export type {
	DrawBounds,
	ObjectDocValidateFn,
	CanvasFontFamily,
	CanvasFontFamilyId,
	TextMeasureFont,
	VisualLine,
	TextWidthMeasurer,
	TextWidthMeasurerFactory,
} from "@jiscribe/doc/unstable";
