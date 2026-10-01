import { measureTextSize } from "./measureTextSize";
import { TEXT_DOC_DEFAULTS, type TextDoc, type TextLayoutDoc } from "./TextDoc";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { createPointObjectFactory } from "../../utils/createPointObjectFactory";

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
 *
 * The measurement is the one the type declares its box by (calcTextDocBounds), so a
 * new text is placed at the box a saved one is reported, aligned and distributed by.
 */
export const TextObjectFactory: ObjectFactory = {
	createDoc: (position, overrides) =>
		resolveFactory(overrides).createDoc(position, overrides),

	calcDimensions: (overrides) =>
		resolveFactory(overrides).calcDimensions(overrides),
};
