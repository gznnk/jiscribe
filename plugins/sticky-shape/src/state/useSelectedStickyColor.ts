import {
	SHAPE_STYLE_FALLBACK,
	selectionValueOr,
	useSelectionStyle,
} from "@jiscribe/canvas-sdk";

/**
 * The paper color the selection is drawn with, for the controls that state it
 * (the ObjectMenu's StickyColorMenu and the palette it shares with the sidebar).
 *
 * @returns The fill every selected note carries, or `SHAPE_STYLE_FALLBACK.fill`
 *   when they disagree or none carries one
 */
export const useSelectedStickyColor = (): string =>
	selectionValueOr(useSelectionStyle("fill"), SHAPE_STYLE_FALLBACK.fill);
