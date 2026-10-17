import {
	resolveTextSlotStyle,
	type TextSlotStyle,
} from "../../model/objects/types/text/TextSlot";
import type { TextMeasureFont } from "../measure/TextMeasureFont";
import { DEFAULT_FONT_FAMILY } from "../style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "../style/textStyleFallback";

/**
 * Font the body of a root-form doc is drawn — and so measured — with: the flat
 * `font*` fields such a doc (`text: "body"` / `"source"`) spells its styling out in,
 * over the type's own body defaults, over the shared last resort. A separate
 * resolution from the canvas's `resolveTextObjectFont`, which reads a state's slot;
 * the two fill in the same fallbacks and must keep doing so.
 *
 * @param doc - Any doc-shaped record; only `fontSize` / `fontFamily` / `fontWeight` / `fontStyle` are read, each ignored unless it has its declared type
 * @param slotDefaults - The type's defaults for its body slot (`extractTextSlotStyleDefaults`); omitted leaves `doc` alone against the shared fallback, which is enough for a type whose DOC_DEFAULTS state the fields themselves
 * @returns The font with every fallback filled in, ready to measure with
 */
export const resolveDocBodyFont = (
	doc: Readonly<Record<string, unknown>>,
	slotDefaults?: TextSlotStyle,
): TextMeasureFont => {
	const style = resolveTextSlotStyle(slotDefaults, {
		fontSize: typeof doc.fontSize === "number" ? doc.fontSize : undefined,
		fontFamily: typeof doc.fontFamily === "string" ? doc.fontFamily : undefined,
		fontWeight: typeof doc.fontWeight === "string" ? doc.fontWeight : undefined,
		fontStyle: typeof doc.fontStyle === "string" ? doc.fontStyle : undefined,
	});
	return {
		fontSize: style.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
		fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight: style.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
		fontStyle: style.fontStyle,
	};
};
