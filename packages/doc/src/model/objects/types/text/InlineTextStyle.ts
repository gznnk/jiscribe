import { isNumber, isString } from "@jiscribe/basic-validators";

import type { TextBaseStyle } from "./TextBaseStyle";
import { TEXT_BASE_STYLE_KEYS } from "./TextBaseStyle";
import type { TextEmphasisStyle } from "./TextEmphasisStyle";
import { TEXT_EMPHASIS_STYLE_KEYS } from "./TextEmphasisStyle";
import { exhaustiveKeysOf } from "../../utils/exhaustiveKeys";
import { pickDefined } from "../../utils/pickDefined";

/**
 * The typography that may differ *inside* one body of text. Alignment is
 * deliberately absent: it places the whole block, so it stays on the slot
 * (TextSlot), and only what a run of characters can carry on its own lives here.
 */
export type InlineTextStyle = TextBaseStyle & TextEmphasisStyle;

/** Field names of the inline typography, in the order a slot declares them. */
export const TEXT_INLINE_STYLE_KEYS = exhaustiveKeysOf<InlineTextStyle>()([
	...TEXT_BASE_STYLE_KEYS,
	...TEXT_EMPHASIS_STYLE_KEYS,
] as const);

/**
 * Structural check of the inline styling fields, shared by the run and the slot
 * guards. Strings are only checked as strings: whether one is a real CSS color
 * and safe to inline is the state layer's boundary check (isValidTextStyleState),
 * which needs browser APIs this layer cannot reach.
 *
 * @param value - The object carrying the fields; each is checked only when present
 * @returns True when every present inline style field has its declared type
 */
export const hasValidInlineTextStyle = (
	value: Record<string, unknown>,
): boolean => {
	if (value.fontColor !== undefined && !isString(value.fontColor)) {
		return false;
	}
	if (value.fontSize !== undefined && !isNumber(value.fontSize)) {
		return false;
	}
	if (value.fontFamily !== undefined && !isString(value.fontFamily)) {
		return false;
	}
	if (value.fontWeight !== undefined && !isString(value.fontWeight)) {
		return false;
	}
	if (value.fontStyle !== undefined && !isString(value.fontStyle)) {
		return false;
	}
	if (value.textDecoration !== undefined && !isString(value.textDecoration)) {
		return false;
	}
	return true;
};

/** Whether any inline style field is set, i.e. whether the run differs from the slot at all. */
export const hasInlineTextStyle = (style: InlineTextStyle): boolean =>
	TEXT_INLINE_STYLE_KEYS.some((key) => style[key] !== undefined);

/** Whether two runs are drawn identically, and so may be merged into one. */
export const isSameInlineTextStyle = (
	a: InlineTextStyle,
	b: InlineTextStyle,
): boolean => TEXT_INLINE_STYLE_KEYS.every((key) => a[key] === b[key]);

/** Copies the inline fields that are actually set, so a run gains no `undefined`-valued keys. */
export const pickDefinedInlineTextStyle = (
	source: InlineTextStyle,
): InlineTextStyle => pickDefined(source, TEXT_INLINE_STYLE_KEYS);
