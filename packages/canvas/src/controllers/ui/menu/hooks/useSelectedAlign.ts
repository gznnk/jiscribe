import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";

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

/**
 * Where the selected text sits across the width of its region, for the two
 * surfaces that offer it (AlignmentMenu, TextAlignItem). A text whose type
 * declares no alignment either reads as what the drawing falls back to
 * (TEXT_STYLE_FALLBACK), so the lit segment is the one the text is drawn at.
 *
 * @returns The alignment in force and whether the selection disagrees
 */
export const useSelectedTextAlign = (): SelectedAlign<TextAlign> => {
	const textAlign = useSelectionStyle("textAlign");
	return {
		value: selectionValueOr(textAlign, TEXT_STYLE_FALLBACK.textAlign),
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
		value: selectionValueOr(verticalAlign, TEXT_STYLE_FALLBACK.verticalAlign),
		isMixed: isMixedSelectionValue(verticalAlign),
	};
};
