import { isNumber } from "@jiscribe/basic-validators";
import {
	calcLabelTextBoxSize,
	isRichText,
	richTextToPlain,
} from "@jiscribe/doc";
import type { TextSlot, TextSlotStyle } from "@jiscribe/doc";
import type { Rect } from "@jiscribe/geometry";

import { readContainerHeaderHeight } from "./calcContainerHeaderHeight";
import { CONTAINER_DOC_DEFAULTS } from "./ContainerDoc";

/** The typography a title is measured with where the document states none. */
const CONTAINER_TITLE_STYLE_DEFAULTS: TextSlotStyle = {
	fontSize: CONTAINER_DOC_DEFAULTS.fontSize,
	fontWeight: CONTAINER_DOC_DEFAULTS.fontWeight,
};

/**
 * The part of the header band the title's text covers — the type's
 * `ObjectDocDefinition.layoutContainerTitleRegion`: as wide as the title set on one
 * line (it wraps in the band only when it is wider than the box, where the region is
 * the whole band's width anyway), at the end of the band its `textAlign` puts it.
 *
 * @param doc - The container as the document holds it; `width`, `height`, `headerHeight`, `text`, `textAlign` and the font fields are read, each as an unknown
 * @returns The region in local coordinates (shape centre as origin), top-left based and as tall as the stated header band; width 0 for a title with no characters; undefined when `width` or `height` is not a finite number
 */
export const calcContainerTitleRegion = (
	doc: Readonly<Record<string, unknown>>,
): Rect | undefined => {
	const { width, height, text, textAlign } = doc;
	if (!isNumber(width) || !isNumber(height)) {
		return undefined;
	}
	const hasTitle = isRichText(text) && richTextToPlain(text) !== "";
	const titleWidth = hasTitle
		? Math.min(
				calcLabelTextBoxSize(
					doc as Partial<TextSlot>,
					CONTAINER_TITLE_STYLE_DEFAULTS,
				).width,
				width,
			)
		: 0;
	const align = textAlign ?? CONTAINER_DOC_DEFAULTS.textAlign;
	let x = -width / 2;
	if (align === "center") {
		x = -titleWidth / 2;
	} else if (align === "right") {
		x = width / 2 - titleWidth;
	}
	return {
		x,
		y: -height / 2,
		width: titleWidth,
		height: readContainerHeaderHeight(doc),
	};
};
