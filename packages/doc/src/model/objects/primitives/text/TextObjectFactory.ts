import { TEXT_DOC_DEFAULTS, type TextDoc, type TextLayoutDoc } from "./TextDoc";
import { calcTextObjectFrameSize } from "../../../../text/object/calcTextObjectFrameSize";
import { resolveDocBodyFont } from "../../../../text/object/resolveDocBodyFont";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { isRichText } from "../../types/text/RichText";
import {
	createPointObjectFactory,
	type PointObjectSizeResolver,
} from "../../utils/createPointObjectFactory";

/**
 * The box the text draws, which is the whole of its size: TEXT_DOC_DEFAULTS state
 * the four font fields, so the merged doc always resolves to a concrete font. Only
 * the block layout wraps in a stored width — the rule `TextMapper.textToState`
 * measures a loaded doc by, so a created text and a reloaded one agree on the box.
 */
const measureTextSize: PointObjectSizeResolver = (doc) =>
	calcTextObjectFrameSize(
		isRichText(doc.text) ? doc.text : "",
		resolveDocBodyFont(doc),
		doc.textLayout === "block" && typeof doc.width === "number"
			? doc.width
			: undefined,
	);

/**
 * The width a block text wraps in, which the point factory drops from `overrides`
 * along with every other box field and so has to reach it as one of the defaults:
 * the measurement reads it off the merged doc, and the created doc keeps it.
 */
const readBlockWidth = (
	overrides?: Record<string, unknown>,
): Pick<TextLayoutDoc, "width"> =>
	overrides?.textLayout === "block" && typeof overrides.width === "number"
		? { width: overrides.width }
		: {};

/** The factory one call runs through, its defaults carrying that call's wrap width. */
const resolveFactory = (overrides?: Record<string, unknown>): ObjectFactory =>
	createPointObjectFactory<Omit<TextDoc, "id">>(
		{ ...TEXT_DOC_DEFAULTS, ...readBlockWidth(overrides) },
		measureTextSize,
	);

/**
 * Factory for text objects. The created doc carries the drawn top-left corner of the
 * box measured from the text, and no size of its own: the box is measured again
 * wherever the doc is read (canvasToState and the reducer's size reconcile), which is
 * what lets the text grow away from that corner.
 */
export const TextObjectFactory: ObjectFactory = {
	createDoc: (position, overrides) =>
		resolveFactory(overrides).createDoc(position, overrides),

	calcDimensions: (overrides) =>
		resolveFactory(overrides).calcDimensions(overrides),
};
