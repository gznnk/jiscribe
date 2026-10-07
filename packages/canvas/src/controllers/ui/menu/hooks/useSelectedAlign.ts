import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

import { useSelectionStyle } from "../../../style/SelectionStyleReaderContext";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../../../style/SelectionValue";

/** Where the selected text sits, as an alignment row draws it. */
type SelectedAlign<TAlign> = {
	/** The value in force: the one the selection agrees on, or what unset is drawn with. */
	value: TAlign;
	/** Whether the selection disagrees, so no segment reads lit. */
	isMixed: boolean;
};

/** What a text with no `textAlign` of its own is drawn with, so that is the segment to light. */
const UNSET_TEXT_ALIGN = "left";

/** What a text with no `verticalAlign` of its own is drawn with. */
const UNSET_VERTICAL_ALIGN = "middle";

/**
 * Where the selected text sits across the width of its region, for the two
 * surfaces that offer it (AlignmentMenu, TextAlignItem) — one place for the
 * value unset is drawn with.
 *
 * @returns The alignment in force and whether the selection disagrees
 */
export const useSelectedTextAlign = (): SelectedAlign<TextAlign> => {
	const textAlign = useSelectionStyle("textAlign");
	return {
		value: selectionValueOr(textAlign, UNSET_TEXT_ALIGN),
		isMixed: isMixedSelectionValue(textAlign),
	};
};

/**
 * Where the selected text sits down the height of its region, the vertical twin
 * of {@link useSelectedTextAlign}.
 *
 * @returns The alignment in force and whether the selection disagrees
 */
export const useSelectedVerticalAlign = (): SelectedAlign<VerticalAlign> => {
	const verticalAlign = useSelectionStyle("verticalAlign");
	return {
		value: selectionValueOr(verticalAlign, UNSET_VERTICAL_ALIGN),
		isMixed: isMixedSelectionValue(verticalAlign),
	};
};
